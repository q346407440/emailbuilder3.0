/** 内置 catalog 列表的常规排序策略（派生 similarTo/complement 见 sort 策略对象） */
export const BUILTIN_COLLECTION_SORT_IDS = [
  "catalogOrder",
  "nameAsc",
  "nameDesc",
  "salesVolumeDesc",
  "conversionDesc",
  "priceDesc",
  "priceAsc",
] as const;

export type BuiltinCollectionSortId = (typeof BUILTIN_COLLECTION_SORT_IDS)[number];

export const DEFAULT_BUILTIN_COLLECTION_SORT: BuiltinCollectionSortId = "catalogOrder";

/** 商品列表可选排序（含转化率） */
export const BUILTIN_PRODUCT_SORT_IDS = [
  "catalogOrder",
  "nameAsc",
  "nameDesc",
  "salesVolumeDesc",
  "conversionDesc",
  "priceDesc",
  "priceAsc",
] as const satisfies readonly BuiltinCollectionSortId[];

/** 专辑列表可选排序 */
export const BUILTIN_ALBUM_SORT_IDS = [
  "catalogOrder",
  "nameAsc",
  "nameDesc",
  "salesVolumeDesc",
] as const satisfies readonly BuiltinCollectionSortId[];

export function isBuiltinCollectionSortId(value: string): value is BuiltinCollectionSortId {
  return (BUILTIN_COLLECTION_SORT_IDS as readonly string[]).includes(value);
}

export function normalizeBuiltinCollectionSortId(
  sort: BuiltinCollectionSortId | undefined
): BuiltinCollectionSortId {
  if (!sort) return DEFAULT_BUILTIN_COLLECTION_SORT;
  return sort;
}

/** 配置面板 / Inspector 展示用 */
export function builtinCollectionSortLabel(
  sort: BuiltinCollectionSortId,
  catalog?: "products" | "albums"
): string {
  const id = normalizeBuiltinCollectionSortId(sort);
  switch (id) {
    case "catalogOrder":
      return "默认（后端返回顺序）";
    case "nameAsc":
      return "名称 A→Z";
    case "nameDesc":
      return "名称 Z→A";
    case "salesVolumeDesc":
      return "销量从高到低";
    case "conversionDesc":
      return catalog === "albums" ? "销量" : "转化率从高到低";
    case "priceDesc":
      return "售价从高到低";
    case "priceAsc":
      return "售价从低到高";
    default:
      return id;
  }
}
