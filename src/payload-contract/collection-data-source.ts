import type { BuiltinAlbumListConfig, BuiltinProductListConfig } from "./collection-builtin-catalog-config";
import type { BuiltinCollectionSortPolicyInput } from "./collection-builtin-sort-policy";

/** 内置列表 catalog（商品 / 专辑 mock，各 10 条） */
export const BUILTIN_COLLECTION_CATALOG_IDS = ["products", "albums"] as const;

export type BuiltinCollectionCatalogId = (typeof BUILTIN_COLLECTION_CATALOG_IDS)[number];

export type CollectionDataSource =
  | { type: "custom" }
  | {
      type: "remote";
      provider: "builtin";
      catalog: BuiltinCollectionCatalogId;
      /** 排序 / 派生策略；常规为 BuiltinCollectionSortId 字符串，相似品/搭配品为 { strategy, targetSlotId } */
      sort?: BuiltinCollectionSortPolicyInput;
      /** catalog=products 时：粒度、范围、SKU 树选等 */
      productConfig?: BuiltinProductListConfig;
      /** catalog=albums 时：多选专辑 */
      albumConfig?: BuiltinAlbumListConfig;
    };

export function defaultCollectionDataSource(): CollectionDataSource {
  return { type: "custom" };
}

export function isBuiltinCollectionCatalogId(value: string): value is BuiltinCollectionCatalogId {
  return (BUILTIN_COLLECTION_CATALOG_IDS as readonly string[]).includes(value);
}
