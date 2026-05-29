import type { BuiltinAlbumListConfig } from "../payload-contract/collection-builtin-catalog-config";
import { normalizeBuiltinAlbumListConfig } from "../payload-contract/collection-builtin-catalog-config";
import type { BuiltinCollectionSortId } from "../payload-contract/collection-builtin-sort";
import { normalizeBuiltinCollectionSortId } from "../payload-contract/collection-builtin-sort";
import type { BindingCollectionField } from "../types/email";
import { BUILTIN_ALBUMS_MOCK, projectBuiltinCatalogItemsFromRows } from "./builtinCollectionCatalog";

/** 内置商品专辑列表：多选专辑 → 排序 → 投影 */
export function resolveBuiltinAlbumListItems(opts: {
  config: BuiltinAlbumListConfig | undefined;
  itemFields: BindingCollectionField[];
  limit: number;
  sort?: BuiltinCollectionSortId;
}): Record<string, unknown>[] {
  const config = normalizeBuiltinAlbumListConfig(opts.config);
  const sort = normalizeBuiltinCollectionSortId(opts.sort);
  const selected = config.selectedAlbumIds ?? [];
  const rows =
    selected.length > 0
      ? BUILTIN_ALBUMS_MOCK.filter((a) => selected.includes(String(a.id ?? "")))
      : [];
  return projectBuiltinCatalogItemsFromRows(rows, opts.itemFields, opts.limit, sort, "albums");
}
