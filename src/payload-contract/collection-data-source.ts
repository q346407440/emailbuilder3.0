import type { BuiltinCollectionExtract } from "./collection-builtin-extract";
import type { BuiltinCollectionSortId } from "./collection-builtin-sort";

/** 内置列表 catalog（商品 / 专辑 mock，各 10 条） */
export const BUILTIN_COLLECTION_CATALOG_IDS = ["products", "albums"] as const;

export type BuiltinCollectionCatalogId = (typeof BUILTIN_COLLECTION_CATALOG_IDS)[number];

export type CollectionDataSource =
  | { type: "custom" }
  | {
      type: "remote";
      provider: "builtin";
      catalog: BuiltinCollectionCatalogId;
      /** 在 catalog 范围内的排序；编辑器预览与运行时解析共用契约 */
      sort?: BuiltinCollectionSortId;
      /** 在 catalog 范围内做相似品等衍生 */
      extract?: BuiltinCollectionExtract;
    };

export function defaultCollectionDataSource(): CollectionDataSource {
  return { type: "custom" };
}

export function isBuiltinCollectionCatalogId(value: string): value is BuiltinCollectionCatalogId {
  return (BUILTIN_COLLECTION_CATALOG_IDS as readonly string[]).includes(value);
}
