import type { BindingCollectionField } from "../types/email";

/** 商品列表 · SPU 下嵌套 `skus` 子列表标准列（payload / repeat 共用） */
export const BUILTIN_PRODUCT_SKU_NESTED_ITEM_FIELDS: BindingCollectionField[] = [
  { key: "imageSrc", label: "规格图", valueType: "url", required: true },
  { key: "title", label: "规格名", valueType: "string", required: true },
  { key: "href", label: "规格链接", valueType: "url", required: true },
  { key: "salePrice", label: "现价", valueType: "string", required: true },
  { key: "originalPrice", label: "原价", valueType: "string", required: true },
  { key: "inventoryQuantity", label: "库存", valueType: "number", required: true },
  { key: "totalSales", label: "销量", valueType: "number", required: true },
];

/** 内置商品列表 · 按 SPU 行 · 默认列（含规格子列表） */
export const BUILTIN_PRODUCT_SPU_ITEM_FIELDS: BindingCollectionField[] = [
  { key: "imageSrc", label: "商品图", valueType: "url", required: true },
  { key: "name", label: "商品名", valueType: "string", required: true },
  { key: "salePrice", label: "现价", valueType: "string", required: true },
  { key: "originalPrice", label: "原价", valueType: "string", required: true },
  { key: "badge", label: "角标", valueType: "string", required: true },
  { key: "href", label: "商品链接", valueType: "url", required: true },
  {
    key: "skus",
    label: "规格列表",
    valueType: "collection",
    itemFields: BUILTIN_PRODUCT_SKU_NESTED_ITEM_FIELDS,
    minItems: 0,
    maxItems: 5,
  },
];

/** 内置商品列表 · 按 SKU 扁平行 · 默认列 */
export const BUILTIN_PRODUCT_SKU_ITEM_FIELDS: BindingCollectionField[] = [
  ...BUILTIN_PRODUCT_SKU_NESTED_ITEM_FIELDS,
  { key: "spuName", label: "所属商品名", valueType: "string" },
  { key: "spuHref", label: "所属商品链接", valueType: "url" },
];

/** 内置商品专辑列表 · 默认列 */
export const BUILTIN_ALBUM_ITEM_FIELDS: BindingCollectionField[] = [
  { key: "coverSrc", label: "封面图", valueType: "url", required: true },
  { key: "title", label: "专辑名", valueType: "string", required: true },
  { key: "description", label: "简介", valueType: "string" },
  { key: "href", label: "专辑链接", valueType: "url", required: true },
];
