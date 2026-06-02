import type { BuiltinCollectionSortId } from "../payload-contract/collection-builtin-sort";
import type { BindingCollectionField } from "../types/email";
import {
  flattenBuiltinProductRow,
  projectBuiltinCatalogItemsFromRows,
  projectRowsToItemFields,
} from "./builtinCollectionCatalog";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "./builtinProductsMockData";
import type { BuiltinProductMock } from "./builtinProductMockTypes";

export const MERCHANT_SPU_TREE_RELATED_NESTED_KEYS = ["similarSpus", "complementSpus"] as const;
export type MerchantSpuTreeRelatedNestedKey = (typeof MERCHANT_SPU_TREE_RELATED_NESTED_KEYS)[number];

export function isMerchantSpuTreeRelatedNestedKey(key: string): key is MerchantSpuTreeRelatedNestedKey {
  return (MERCHANT_SPU_TREE_RELATED_NESTED_KEYS as readonly string[]).includes(key);
}

/** 商家端 SPU 树形列表 · 父/子层共用标量列（不含 skus） */
export const MERCHANT_SPU_TREE_SCALAR_FIELDS: BindingCollectionField[] = [
  { key: "imageSrc", label: "商品图", valueType: "url", required: true },
  { key: "imageAlt", label: "图片替代文字", valueType: "string", required: true },
  { key: "name", label: "商品名", valueType: "string", required: true },
  { key: "salePrice", label: "现价", valueType: "string", required: true },
  { key: "originalPrice", label: "原价", valueType: "string", required: true },
  { key: "badge", label: "角标", valueType: "string", required: true },
  { key: "href", label: "商品链接", valueType: "url", required: true },
];

export const MERCHANT_SIMILAR_SPU_TREE_ITEM_FIELDS: BindingCollectionField[] = [
  ...MERCHANT_SPU_TREE_SCALAR_FIELDS,
  {
    key: "similarSpus",
    label: "相似品",
    valueType: "collection",
    itemFields: MERCHANT_SPU_TREE_SCALAR_FIELDS,
    minItems: 1,
    maxItems: 5,
  },
];

export const MERCHANT_COMPLEMENT_SPU_TREE_ITEM_FIELDS: BindingCollectionField[] = [
  ...MERCHANT_SPU_TREE_SCALAR_FIELDS,
  {
    key: "complementSpus",
    label: "搭配品",
    valueType: "collection",
    itemFields: MERCHANT_SPU_TREE_SCALAR_FIELDS,
    minItems: 1,
    maxItems: 5,
  },
];

/** 10 条父 SPU；子列表条数按 5→4→3→2→1 循环两轮 */
export const MERCHANT_SPU_TREE_CHILD_COUNTS = [5, 4, 3, 2, 1, 5, 4, 3, 2, 1] as const;

export const MERCHANT_SPU_TREE_PARENT_COUNT = 10;

/** 用作父行的 mock 商品（排除演示用相似品/搭配品单条） */
export function merchantSpuTreeParentProducts(): BuiltinProductMock[] {
  const pool = BUILTIN_PRODUCTS_MOCK_RAW.filter(
    (p) => p.handle !== "mock-similar-product" && p.handle !== "mock-complement-product"
  );
  if (pool.length < MERCHANT_SPU_TREE_PARENT_COUNT) {
    throw new Error(
      `mock 商品不足 ${MERCHANT_SPU_TREE_PARENT_COUNT} 条，无法生成 SPU 树形列表预设`
    );
  }
  return pool.slice(0, MERCHANT_SPU_TREE_PARENT_COUNT);
}

function nonEmptyBadge(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
}

export function projectMerchantSpuTreeScalarRow(product: BuiltinProductMock): Record<string, unknown> {
  const flat = flattenBuiltinProductRow(product);
  return {
    imageSrc: flat.imageSrc,
    imageAlt: flat.imageAlt,
    name: flat.name,
    salePrice: flat.salePrice,
    originalPrice: flat.originalPrice,
    badge: nonEmptyBadge(flat.badge),
    href: flat.href,
  };
}

function pickRelatedChildProducts(
  parents: BuiltinProductMock[],
  parentIndex: number,
  count: number
): BuiltinProductMock[] {
  const parent = parents[parentIndex]!;
  const pool = parents.filter((p) => p.id !== parent.id);
  const out: BuiltinProductMock[] = [];
  for (let j = 0; j < count; j++) {
    out.push(pool[(parentIndex + j + 1) % pool.length]!);
  }
  return out;
}

/** 与内置商品列表相同：先按排序取前 limit 个主 SPU */
export function pickSortedLimitedParentProducts(
  products: BuiltinProductMock[],
  limit: number,
  sort: BuiltinCollectionSortId
): BuiltinProductMock[] {
  if (products.length === 0 || limit <= 0) return [];
  const flatRows = products.map(flattenBuiltinProductRow);
  const sortedFlat = projectBuiltinCatalogItemsFromRows(
    flatRows,
    MERCHANT_SPU_TREE_SCALAR_FIELDS,
    limit,
    sort,
    "products"
  );
  const byHref = new Map(products.map((p) => [p.href, p]));
  const ordered: BuiltinProductMock[] = [];
  const seen = new Set<string>();
  for (const row of sortedFlat) {
    const href = String(row.href ?? "");
    const product = byHref.get(href);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    ordered.push(product);
  }
  return ordered;
}

function relatedNestedKeyFromItemFields(
  itemFields: BindingCollectionField[]
): MerchantSpuTreeRelatedNestedKey | null {
  for (const key of MERCHANT_SPU_TREE_RELATED_NESTED_KEYS) {
    if (itemFields.some((f) => f.valueType === "collection" && f.key === key)) {
      return key;
    }
  }
  return null;
}

/** 为已投影的父 SPU 行挂上相似品/搭配品子列表（mock：子条数 5→4→3→2→1 循环） */
export function attachMerchantSpuTreeRelatedNestedRows(
  parentRows: Record<string, unknown>[],
  orderedParents: BuiltinProductMock[],
  itemFields: BindingCollectionField[]
): Record<string, unknown>[] {
  const nestedKey = relatedNestedKeyFromItemFields(itemFields);
  if (!nestedKey) return parentRows;
  const nestedField = itemFields.find(
    (f): f is Extract<BindingCollectionField, { valueType: "collection" }> =>
      f.valueType === "collection" && f.key === nestedKey
  );
  if (!nestedField) return parentRows;

  return parentRows.map((row, i) => {
    const childCount = MERCHANT_SPU_TREE_CHILD_COUNTS[i % MERCHANT_SPU_TREE_CHILD_COUNTS.length] ?? 1;
    const children = pickRelatedChildProducts(orderedParents, i, childCount);
    const childRows = projectRowsToItemFields(
      children.map(projectMerchantSpuTreeScalarRow),
      nestedField.itemFields
    ).slice(0, nestedField.maxItems ?? childCount);
    return { ...row, [nestedKey]: childRows };
  });
}

export function buildMerchantSimilarSpuTreeSeedValues(): Record<string, unknown>[] {
  const parents = merchantSpuTreeParentProducts();
  const parentRows = parents.map((p) => projectMerchantSpuTreeScalarRow(p));
  return attachMerchantSpuTreeRelatedNestedRows(
    parentRows,
    parents,
    MERCHANT_SIMILAR_SPU_TREE_ITEM_FIELDS
  );
}

export function buildMerchantComplementSpuTreeSeedValues(): Record<string, unknown>[] {
  const parents = merchantSpuTreeParentProducts();
  const parentRows = parents.map((p) => projectMerchantSpuTreeScalarRow(p));
  return attachMerchantSpuTreeRelatedNestedRows(
    parentRows,
    parents,
    MERCHANT_COMPLEMENT_SPU_TREE_ITEM_FIELDS
  );
}

/** 相似品/搭配品树形列表：选择商品仅 SPU，不含 SKU Tab */
export function builtinProductListItemFieldsRequireSpuSelectionOnly(
  itemFields: BindingCollectionField[]
): boolean {
  const hasRelated = itemFields.some(
    (f) => f.valueType === "collection" && isMerchantSpuTreeRelatedNestedKey(f.key)
  );
  const hasSkus = itemFields.some((f) => f.valueType === "collection" && f.key === "skus");
  return hasRelated && !hasSkus;
}
