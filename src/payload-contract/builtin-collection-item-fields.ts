import type { BindingCollectionField } from "../types/email";

/** 内置商品列表 · 按 SPU 行 · 默认列（含规格子列表） */
export const BUILTIN_PRODUCT_SPU_ITEM_FIELDS: BindingCollectionField[] = [
  { key: "imageSrc", label: "商品图", valueType: "url", required: true },
  { key: "imageAlt", label: "图片替代文字", valueType: "string", required: true },
  { key: "name", label: "商品名", valueType: "string", required: true },
  { key: "salePrice", label: "现价", valueType: "string", required: true },
  { key: "originalPrice", label: "原价", valueType: "string", required: true },
  { key: "badge", label: "角标", valueType: "string", required: true },
  { key: "href", label: "商品链接", valueType: "url", required: true },
  {
    key: "skus",
    label: "规格列表",
    valueType: "collection",
    itemFields: [
      { key: "imageSrc", label: "规格图", valueType: "url", required: true },
      { key: "imageAlt", label: "图替代文字", valueType: "string", required: true },
      { key: "title", label: "规格名", valueType: "string", required: true },
      { key: "href", label: "规格链接", valueType: "url", required: true },
    ],
    minItems: 0,
    maxItems: 5,
  },
];

/** 内置商品列表 · 按 SKU 扁平行 · 默认列 */
export const BUILTIN_PRODUCT_SKU_ITEM_FIELDS: BindingCollectionField[] = [
  { key: "imageSrc", label: "规格图", valueType: "url", required: true },
  { key: "imageAlt", label: "图替代文字", valueType: "string", required: true },
  { key: "title", label: "规格名", valueType: "string", required: true },
  { key: "href", label: "规格链接", valueType: "url", required: true },
  { key: "salePrice", label: "售价", valueType: "string", required: true },
  { key: "originalPrice", label: "对比价", valueType: "string", required: true },
  { key: "spuName", label: "所属商品名", valueType: "string" },
  { key: "spuHref", label: "所属商品链接", valueType: "url" },
];

/** 内置商品专辑列表 · 默认列 */
export const BUILTIN_ALBUM_ITEM_FIELDS: BindingCollectionField[] = [
  { key: "coverSrc", label: "封面图", valueType: "url", required: true },
  { key: "coverAlt", label: "封面替代文字", valueType: "string", required: true },
  { key: "title", label: "专辑名", valueType: "string", required: true },
  { key: "description", label: "简介", valueType: "string" },
  { key: "href", label: "专辑链接", valueType: "url", required: true },
];
