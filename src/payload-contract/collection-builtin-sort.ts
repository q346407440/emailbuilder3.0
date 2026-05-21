/** 内置 catalog 列表的排序策略（仅 provider=builtin 时生效） */
export const BUILTIN_COLLECTION_SORT_IDS = [
  "catalogOrder",
  "salesDesc",
  "salesAsc",
  "nameAsc",
  "nameDesc",
] as const;

export type BuiltinCollectionSortId = (typeof BUILTIN_COLLECTION_SORT_IDS)[number];

export const DEFAULT_BUILTIN_COLLECTION_SORT: BuiltinCollectionSortId = "catalogOrder";

export function isBuiltinCollectionSortId(value: string): value is BuiltinCollectionSortId {
  return (BUILTIN_COLLECTION_SORT_IDS as readonly string[]).includes(value);
}

/** 配置面板 / Inspector 展示用 */
export function builtinCollectionSortLabel(sort: BuiltinCollectionSortId): string {
  switch (sort) {
    case "catalogOrder":
      return "目录默认顺序";
    case "salesDesc":
      return "售价从高到低";
    case "salesAsc":
      return "售价从低到高";
    case "nameAsc":
      return "名称 A→Z";
    case "nameDesc":
      return "名称 Z→A";
    default:
      return sort;
  }
}
