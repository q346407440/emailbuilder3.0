import type { BuiltinProductListConfig } from "../payload-contract/collection-builtin-catalog-config";
import {
  formatBuiltinSkuSelectionKey,
  normalizeBuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  normalizeBuiltinCollectionSortId,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import type { NormalizedBuiltinSortPolicy } from "../payload-contract/collection-builtin-sort-policy";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import {
  flattenBuiltinProductRow,
  projectBuiltinCatalogComplement,
  projectBuiltinCatalogItemsFromRows,
  projectBuiltinCatalogSimilarTo,
  projectRowsToItemFields,
} from "./builtinCollectionCatalog";
import { BUILTIN_MOCK_COLLECTIONS } from "./builtinMockCollections";
import type { BuiltinProductMock } from "./builtinProductMockTypes";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "./builtinProductsMockData";
import {
  attachMerchantSpuTreeRelatedNestedRows,
  isMerchantSpuTreeRelatedNestedKey,
  pickSortedLimitedParentProducts,
} from "./loyaltyMerchantSpuTreePresetSeed";

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

function regularSortFromPolicy(sortPolicy: NormalizedBuiltinSortPolicy): BuiltinCollectionSortId {
  return sortPolicy.kind === "regular" ? sortPolicy.sort : DEFAULT_BUILTIN_COLLECTION_SORT;
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

function projectSpuRowsWithNestedSkus(
  products: BuiltinProductMock[],
  itemFields: BindingCollectionField[],
  limit: number,
  sort: BuiltinCollectionSortId,
  skuSelection?: string[]
): Record<string, unknown>[] {
  const flatRows = products.map(flattenBuiltinProductRow);
  const projected = projectBuiltinCatalogItemsFromRows(flatRows, itemFields, limit, sort, "products");
  const skuKeySet =
    skuSelection && skuSelection.length > 0 ? new Set(skuSelection) : null;
  return projected.map((row, i) => {
    const product = products[i];
    if (!product) return row;
    const skuField = itemFields.find((f) => f.valueType === "collection" && f.key === "skus");
    if (!skuField || skuField.valueType !== "collection") return row;
    const sourceSkus = skuKeySet
      ? product.skus.filter((s) => skuKeySet.has(formatBuiltinSkuSelectionKey(product.id, s.id)))
      : product.skus;
    const skuRows = projectRowsToItemFields(
      sourceSkus as unknown as Record<string, unknown>[],
      skuField.itemFields
    ).slice(0, skuField.maxItems ?? sourceSkus.length);
    return { ...row, skus: skuRows };
  });
}

/** 内置商品列表：按 productConfig 范围 / 排序解析 SPU 行。 */
export function resolveBuiltinProductListItems(opts: {
  config: BuiltinProductListConfig | undefined;
  itemFields: BindingCollectionField[];
  limit: number;
  sort?: BuiltinCollectionSortId;
  sortPolicy?: NormalizedBuiltinSortPolicy;
  payload: EmailPayload;
  anchorRow?: Record<string, unknown> | null;
}): Record<string, unknown>[] {
  const config = normalizeBuiltinProductListConfig(opts.config);
  const sortPolicy =
    opts.sortPolicy ??
    ({ kind: "regular", sort: normalizeBuiltinCollectionSortId(opts.sort) } as const);
  const sort = regularSortFromPolicy(sortPolicy);
  const { itemFields, limit, payload } = opts;

  if (sortPolicy.kind === "derived") {
    const anchorRow =
      opts.anchorRow !== undefined
        ? opts.anchorRow
        : anchorRowFromPayloadAtIndex(payload, sortPolicy.targetSlotId, 1);
    const projectFn =
      sortPolicy.strategy === "complement" ? projectBuiltinCatalogComplement : projectBuiltinCatalogSimilarTo;
    return projectFn("products", itemFields, limit, sort, anchorRow, "href");
  }

  if (
    config.rangeMode === "freeSelect" &&
    (config.selectedSpuIds ?? []).length === 0 &&
    (config.skuSelection ?? []).length === 0
  ) {
    return [];
  }

  const pool = resolveBuiltinProductCandidatePool(config);
  if (itemFields.some((f) => f.valueType === "collection" && f.key === "skus")) {
    return projectSpuRowsWithNestedSkus(pool, itemFields, limit, sort, config.skuSelection);
  }
  if (itemFields.some((f) => f.valueType === "collection" && isMerchantSpuTreeRelatedNestedKey(f.key))) {
    const orderedParents = pickSortedLimitedParentProducts(pool, limit, sort);
    const flatRows = orderedParents.map(flattenBuiltinProductRow);
    const parentRows = projectBuiltinCatalogItemsFromRows(
      flatRows,
      itemFields,
      limit,
      sort,
      "products"
    );
    return attachMerchantSpuTreeRelatedNestedRows(parentRows, orderedParents, itemFields);
  }
  return spuRowsFromConfig(config, itemFields, limit, sort);
}
