import type { BuiltinProductListConfig } from "../payload-contract/collection-builtin-catalog-config";
import {
  formatBuiltinSkuSelectionKey,
  normalizeBuiltinProductListConfig,
  parseBuiltinSkuSelectionKey,
} from "../payload-contract/collection-builtin-catalog-config";
import type { BuiltinCollectionExtract } from "../payload-contract/collection-builtin-extract";
import { builtinCollectionExtractAnchorIndex } from "../payload-contract/collection-builtin-extract";
import {
  normalizeBuiltinCollectionSortId,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import {
  flattenBuiltinProductRow,
  projectBuiltinCatalogComplement,
  projectBuiltinCatalogItemsFromRows,
  projectBuiltinCatalogSimilarTo,
  projectRowsToItemFields,
} from "./builtinCollectionCatalog";
import { BUILTIN_MOCK_COLLECTIONS } from "./builtinMockCollections";
import type { BuiltinProductMock, BuiltinProductSkuMock } from "./builtinProductMockTypes";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "./builtinProductsMockData";

export type BuiltinSpuSkuTreeNode = {
  spuId: string;
  handle: string;
  title: string;
  skus: Array<{ skuId: string; selectionKey: string; title: string; skuCode: string }>;
};

export function listBuiltinSpuSkuTreeNodes(pool?: BuiltinProductMock[]): BuiltinSpuSkuTreeNode[] {
  const products = pool ?? BUILTIN_PRODUCTS_MOCK_RAW;
  return products.map((p) => ({
    spuId: p.id,
    handle: p.handle,
    title: p.title,
    skus: p.skus.map((s) => ({
      skuId: s.id,
      selectionKey: formatBuiltinSkuSelectionKey(p.id, s.id),
      title: s.title,
      skuCode: s.sku,
    })),
  }));
}

function productById(id: string): BuiltinProductMock | undefined {
  return BUILTIN_PRODUCTS_MOCK_RAW.find((p) => p.id === id);
}

/** 按场景配置解析候选 SPU 池 */
export function resolveBuiltinProductCandidatePool(
  config: BuiltinProductListConfig
): BuiltinProductMock[] {
  const normalized = normalizeBuiltinProductListConfig(config);
  if (normalized.rangeMode === "allProducts") {
    return [...BUILTIN_PRODUCTS_MOCK_RAW];
  }
  if (normalized.rangeMode === "byCollection") {
    const ids = new Set<string>();
    for (const collId of normalized.selectedCollectionIds ?? []) {
      const coll = BUILTIN_MOCK_COLLECTIONS.find((c) => c.id === collId);
      for (const pid of coll?.productIds ?? []) {
        ids.add(pid);
      }
    }
    return BUILTIN_PRODUCTS_MOCK_RAW.filter((p) => ids.has(p.id));
  }
  const selected = normalized.selectedSpuIds ?? [];
  if (selected.length === 0) return [];
  return selected.map((id) => productById(id)).filter((p): p is BuiltinProductMock => Boolean(p));
}

function buildSkuFlatRow(product: BuiltinProductMock, sku: BuiltinProductSkuMock): Record<string, unknown> {
  return {
    id: formatBuiltinSkuSelectionKey(product.id, sku.id),
    spuId: product.id,
    skuId: sku.id,
    imageSrc: sku.imageSrc,
    imageAlt: sku.imageAlt,
    title: sku.title,
    href: sku.href,
    salePrice: sku.salePrice,
    originalPrice: sku.originalPrice,
    spuName: product.title,
    spuHref: product.href,
    totalSales: sku.totalSales,
    conversionRate: (sku.totalSales ?? 0) * 0.01,
  };
}

/** SKU 勾选键 → 扁平行（保持勾选顺序） */
export function resolveSkuSelectionToFlatRows(
  selectionKeys: string[],
  pool?: BuiltinProductMock[]
): Record<string, unknown>[] {
  const allowedSpu = new Set((pool ?? BUILTIN_PRODUCTS_MOCK_RAW).map((p) => p.id));
  const rows: Record<string, unknown>[] = [];
  for (const key of selectionKeys) {
    const parsed = parseBuiltinSkuSelectionKey(key);
    if (!parsed || !allowedSpu.has(parsed.spuId)) continue;
    const product = productById(parsed.spuId);
    if (!product) continue;
    const sku = product.skus.find((s) => s.id === parsed.skuId);
    if (!sku) continue;
    rows.push(buildSkuFlatRow(product, sku));
  }
  return rows;
}

function anchorRowFromPayloadAtIndex(
  payload: EmailPayload,
  fromSlotId: string,
  anchorItemIndex: number
): Record<string, unknown> | null {
  const rows = Array.isArray(payload.values[fromSlotId])
    ? (payload.values[fromSlotId] as Record<string, unknown>[])
    : [];
  const idx = Math.max(0, anchorItemIndex - 1);
  return rows[idx] ?? null;
}

function spuRowsFromConfig(
  config: BuiltinProductListConfig,
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId
): Record<string, unknown>[] {
  const pool = resolveBuiltinProductCandidatePool(config);
  const flatRows = pool.map(flattenBuiltinProductRow);
  return projectBuiltinCatalogItemsFromRows(flatRows, itemFields, limit, sort, "products");
}

function skuRowsFromConfig(
  config: BuiltinProductListConfig,
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId
): Record<string, unknown>[] {
  const pool = resolveBuiltinProductCandidatePool(config);
  const keys = config.skuSelection ?? [];
  const flatRows = resolveSkuSelectionToFlatRows(keys, pool);
  if (flatRows.length === 0) return [];
  return projectBuiltinCatalogItemsFromRows(flatRows, itemFields, limit, sort, "products");
}

function projectSpuRowsWithNestedSkus(
  products: BuiltinProductMock[],
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId
): Record<string, unknown>[] {
  const flatRows = products.map(flattenBuiltinProductRow);
  const projected = projectBuiltinCatalogItemsFromRows(flatRows, itemFields, limit, sort, "products");
  return projected.map((row, i) => {
    const product = products[i];
    if (!product) return row;
    const skuField = itemFields.find((f) => f.valueType === "collection" && f.key === "skus");
    if (!skuField || skuField.valueType !== "collection") return row;
    const skuRows = projectRowsToItemFields(
      product.skus as unknown as Record<string, unknown>[],
      skuField.itemFields
    ).slice(0, skuField.maxItems ?? product.skus.length);
    return { ...row, skus: skuRows };
  });
}

/**
 * 内置商品列表：按 productConfig 粒度 / 范围 / 抽取 / 排序解析行。
 */
export function resolveBuiltinProductListItems(opts: {
  config: BuiltinProductListConfig | undefined;
  itemFields: BindingCollectionField[];
  limit: number;
  sort?: BuiltinCollectionSortId;
  extract?: BuiltinCollectionExtract;
  payload: EmailPayload;
}): Record<string, unknown>[] {
  const config = normalizeBuiltinProductListConfig(opts.config);
  const sort = normalizeBuiltinCollectionSortId(opts.sort);
  const extract = opts.extract ?? { kind: "none" };
  const { itemFields, limit, payload } = opts;

  if (extract.kind === "similarTo" || extract.kind === "complement") {
    const anchorIndex = builtinCollectionExtractAnchorIndex(extract);
    const anchorRow = anchorRowFromPayloadAtIndex(payload, extract.fromSlotId, anchorIndex);
    const projectFn =
      extract.kind === "complement" ? projectBuiltinCatalogComplement : projectBuiltinCatalogSimilarTo;
    if (config.rowGranularity === "sku") {
      const spuProjected = projectFn(
        "products",
        [{ key: "href", label: "链", valueType: "url", required: true }],
        Math.max(limit, 3),
        sort,
        anchorRow,
        extract.matchField ?? "href"
      );
      const spuIds = spuProjected
        .map((r) => String(r.href ?? ""))
        .map((href) => BUILTIN_PRODUCTS_MOCK_RAW.find((p) => p.href === href)?.id)
        .filter((id): id is string => Boolean(id));
      const keys: string[] = [];
      for (const spuId of spuIds.slice(0, limit)) {
        const product = productById(spuId);
        const featured = product?.skus[0];
        if (product && featured) {
          keys.push(formatBuiltinSkuSelectionKey(product.id, featured.id));
        }
      }
      const skuConfig: BuiltinProductListConfig = {
        ...config,
        rowGranularity: "sku",
        rangeMode: "freeSelect",
        skuSelection: keys,
      };
      return skuRowsFromConfig(skuConfig, itemFields, limit, sort);
    }
    return projectFn(
      "products",
      itemFields,
      limit,
      sort,
      anchorRow,
      extract.matchField ?? "href"
    );
  }

  if (config.rowGranularity === "sku") {
    return skuRowsFromConfig(config, itemFields, limit, sort);
  }

  if (config.rangeMode === "freeSelect" && (config.selectedSpuIds ?? []).length === 0) {
    return [];
  }

  const pool = resolveBuiltinProductCandidatePool(config);
  if (itemFields.some((f) => f.valueType === "collection" && f.key === "skus")) {
    return projectSpuRowsWithNestedSkus(pool, itemFields, limit, sort);
  }
  return spuRowsFromConfig(config, itemFields, limit, sort);
}
