/** 内置商品 mock：Shopify 风格 SPU + SKU（价格/库存/销量均在 SKU 级） */

export type BuiltinProductSkuMock = {
  /** Variant GID 风格 id */
  id: string;
  /** 规格标题，如「黑色 / 标准装」 */
  title: string;
  /** 商家 SKU 编码 */
  sku: string;
  imageSrc: string;
  salePrice: string;
  originalPrice: string;
  inventoryQuantity: number;
  totalSales: number;
  /** 可选：规格深链 */
  href?: string;
};

/** SKU 单条结构字段（各 SKU 同构；字段关联只展示一套，不按序号展开） */
export const BUILTIN_SKU_SCHEMA_FIELD_KEYS = [
  "imageSrc",
  "salePrice",
  "originalPrice",
  "title",
  "sku",
  "inventoryQuantity",
  "totalSales",
  "href",
] as const;

export type BuiltinSkuSchemaFieldKey = (typeof BUILTIN_SKU_SCHEMA_FIELD_KEYS)[number];

export type BuiltinProductMock = {
  id: string;
  handle: string;
  /** SPU 标题（列表卡片上的商品名） */
  title: string;
  vendor: string;
  productType: string;
  badge: string;
  href: string;
  skus: BuiltinProductSkuMock[];
};
