import type {
  BuiltinAlbumListConfig,
  BuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import {
  DEFAULT_BUILTIN_ALBUM_LIST_CONFIG,
  DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG,
  normalizeBuiltinAlbumListConfig,
  normalizeBuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import type { BuiltinCollectionCatalogId, CollectionDataSource } from "../payload-contract/collection-data-source";
import { defaultCollectionDataSource } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
} from "../payload-contract/collection-builtin-sort";
import {
  readSortPolicyFromBuiltinDataSource,
  regularSortFromPolicy,
  writeSortPolicyToDataSource,
  type NormalizedBuiltinSortPolicy,
} from "../payload-contract/collection-builtin-sort-policy";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import {
  builtinPreviewItemsForSlot,
  emptyValueForField,
  resolveBuiltinSortFromDataSource,
} from "./collectionDataSource";
import { parseCollectionJsonSample, type CollectionJsonSample } from "./collectionFieldMapping";
import { builtinCatalogLabel, builtinProductsCatalogFieldSample } from "./builtinCollectionCatalog";
import type {
  CollectionDataSourceKind,
  CollectionSourceDraftCache,
  PayloadSlotDraft,
} from "./payloadSlotDraft";
import { collectionDataSourceKind, toCollectionItems } from "./payloadSlotDraft";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readCollectionFieldMapFromCache(
  caches: CollectionSourceDraftCache | undefined,
  kind: CollectionDataSourceKind
): Record<string, string> | undefined {
  if (kind === "custom") return caches?.custom?.fieldMap;
  return caches?.builtin?.fieldMap;
}

export type CollectionEditorSnapshot = {
  kind: CollectionDataSourceKind;
  fixedLength: number;
  items: Record<string, unknown>[];
  jsonPaste: string;
  catalog: BuiltinCollectionCatalogId;
  sortPolicy: NormalizedBuiltinSortPolicy;
  productConfig?: BuiltinProductListConfig;
  albumConfig?: BuiltinAlbumListConfig;
};

function kindToDataSource(
  kind: CollectionDataSourceKind,
  catalog: BuiltinCollectionCatalogId,
  sortPolicy: NormalizedBuiltinSortPolicy,
  productConfig?: BuiltinProductListConfig,
  albumConfig?: BuiltinAlbumListConfig
): CollectionDataSource {
  if (kind === "custom") return { type: "custom" };
  const base = {
    type: "remote" as const,
    provider: "builtin" as const,
    catalog,
    sort: writeSortPolicyToDataSource(sortPolicy),
  };
  if (catalog === "products") {
    return {
      ...base,
      productConfig: normalizeBuiltinProductListConfig(
        productConfig ?? DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG
      ),
    };
  }
  if (catalog === "albums") {
    return {
      ...base,
      albumConfig: normalizeBuiltinAlbumListConfig(albumConfig ?? DEFAULT_BUILTIN_ALBUM_LIST_CONFIG),
    };
  }
  return base;
}

export { builtinCatalogLabel };

function writeCacheFromSnapshot(
  caches: CollectionSourceDraftCache,
  snapshot: CollectionEditorSnapshot,
  fieldMap?: Record<string, string>
): CollectionSourceDraftCache {
  const next = { ...caches };
  if (snapshot.kind === "custom") {
    next.custom = {
      values: snapshot.items.map((r) => ({ ...r })),
      jsonPaste: snapshot.jsonPaste,
      ...(fieldMap !== undefined ? { fieldMap: { ...fieldMap } } : {}),
    };
  } else {
    next.builtin = {
      values: snapshot.items.map((r) => ({ ...r })),
      catalog: snapshot.catalog,
      sortPolicy: snapshot.sortPolicy,
      productConfig: snapshot.productConfig,
      albumConfig: snapshot.albumConfig,
      ...(fieldMap !== undefined ? { fieldMap: { ...fieldMap } } : {}),
    };
  }
  return next;
}

/** 从当前 tab 快照推导 JSON 样本（仅展示字段关联，不写 draft） */
export function sampleFromCollectionSnapshot(
  snapshot: CollectionEditorSnapshot
): CollectionJsonSample | null {
  if (snapshot.kind === "custom" && snapshot.jsonPaste.trim()) {
    const result = parseCollectionJsonSample(snapshot.jsonPaste);
    return result.ok ? result.sample : null;
  }
  if (snapshot.kind === "builtin") {
    if (snapshot.catalog === "products") {
      const catalogSample = builtinProductsCatalogFieldSample();
      if (catalogSample) return catalogSample;
    }
    const first = snapshot.items.find(isRecord);
    if (!first) return null;
    return { keys: Object.keys(first), firstItem: first };
  }
  return null;
}

function readBuiltinSortPolicyFromCache(
  caches: CollectionSourceDraftCache["builtin"]
): NormalizedBuiltinSortPolicy {
  return caches?.sortPolicy ?? { kind: "regular", sort: DEFAULT_BUILTIN_COLLECTION_SORT };
}

function readSnapshotFromCache(
  caches: CollectionSourceDraftCache,
  kind: CollectionDataSourceKind,
  itemFields: BindingCollectionField[],
  fixedLength: number,
  payload: EmailPayload,
  slotId: string
): CollectionEditorSnapshot {
  if (kind === "custom" && caches.custom) {
    return {
      kind,
      fixedLength,
      items: caches.custom.values,
      jsonPaste: caches.custom.jsonPaste ?? "",
      catalog: "products",
      sortPolicy: { kind: "regular", sort: DEFAULT_BUILTIN_COLLECTION_SORT },
    };
  }
  if (kind === "builtin" && caches.builtin) {
    return {
      kind,
      fixedLength,
      items: caches.builtin.values,
      jsonPaste: "",
      catalog: caches.builtin.catalog,
      sortPolicy: readBuiltinSortPolicyFromCache(caches.builtin),
      productConfig: caches.builtin.productConfig,
      albumConfig: caches.builtin.albumConfig,
    };
  }

  const emptyItems = Array.from({ length: fixedLength }, () =>
    Object.fromEntries(itemFields.map((f) => [f.key, emptyValueForField(f)]))
  );
  if (kind === "builtin") {
    const catalog: BuiltinCollectionCatalogId = "products";
    const sortPolicy = { kind: "regular" as const, sort: DEFAULT_BUILTIN_COLLECTION_SORT };
    return {
      kind,
      fixedLength,
      items: builtinPreviewItemsForSlot(
        catalog,
        itemFields,
        fixedLength,
        DEFAULT_BUILTIN_COLLECTION_SORT,
        { payload, slotId, sortPolicy }
      ),
      jsonPaste: "",
      catalog,
      sortPolicy,
    };
  }
  return {
    kind: "custom",
    fixedLength,
    items: emptyItems,
    jsonPaste: "",
    catalog: "products",
    sortPolicy: { kind: "regular", sort: DEFAULT_BUILTIN_COLLECTION_SORT },
  };
}

/** 切换数据源：先写入当前 tab 缓存，再读出目标 tab 缓存 */
export function switchCollectionDataSourceDraft(
  draft: PayloadSlotDraft,
  snapshot: CollectionEditorSnapshot,
  nextKind: CollectionDataSourceKind,
  itemFields: BindingCollectionField[],
  payload: EmailPayload,
  slotId: string
): PayloadSlotDraft {
  const caches = writeCacheFromSnapshot(
    { ...draft.collectionSources },
    snapshot,
    draft.collectionFieldMap
  );
  const nextSnapshot = readSnapshotFromCache(
    caches,
    nextKind,
    itemFields,
    snapshot.fixedLength,
    payload,
    slotId
  );
  const nextFieldMap = readCollectionFieldMapFromCache(caches, nextKind) ?? {};
  const dataSource = kindToDataSource(
    nextKind,
    nextSnapshot.catalog,
    nextSnapshot.sortPolicy,
    nextSnapshot.productConfig,
    nextSnapshot.albumConfig
  );

  return {
    ...draft,
    collectionSources: writeCacheFromSnapshot(caches, nextSnapshot, nextFieldMap),
    collectionFieldMap: { ...nextFieldMap },
    activeCollectionSource: nextKind,
    value: nextSnapshot.items.map((r) => ({ ...r })),
    slotDefPatch: {
      ...(draft.slotDefPatch ?? {}),
      dataSource,
      minItems: snapshot.fixedLength,
      maxItems: snapshot.fixedLength,
    },
  };
}

export function patchCollectionDraftSnapshot(
  draft: PayloadSlotDraft,
  snapshot: CollectionEditorSnapshot
): PayloadSlotDraft {
  const dataSource = kindToDataSource(
    snapshot.kind,
    snapshot.catalog,
    snapshot.sortPolicy,
    snapshot.productConfig,
    snapshot.albumConfig
  );
  const caches = writeCacheFromSnapshot(
    { ...draft.collectionSources },
    snapshot,
    draft.collectionFieldMap
  );
  return {
    ...draft,
    collectionSources: caches,
    activeCollectionSource: snapshot.kind,
    value: snapshot.items.map((r) => ({ ...r })),
    slotDefPatch: {
      ...(draft.slotDefPatch ?? {}),
      dataSource,
      minItems: snapshot.fixedLength,
      maxItems: snapshot.fixedLength,
    },
  };
}

export function draftToCollectionSnapshot(
  draft: PayloadSlotDraft,
  _itemFields: BindingCollectionField[],
  committedValues: unknown
): CollectionEditorSnapshot {
  const fixedLength =
    draft.slotDefPatch?.minItems === draft.slotDefPatch?.maxItems
      ? (draft.slotDefPatch?.minItems ?? 1)
      : (draft.slotDefPatch?.maxItems ?? draft.slotDefPatch?.minItems ?? 1);

  const kind = draft.activeCollectionSource ?? collectionDataSourceKind(draft.slotDefPatch?.dataSource);
  const caches = draft.collectionSources ?? {};
  const ds = draft.slotDefPatch?.dataSource ?? defaultCollectionDataSource();

  const itemsForActiveKind = (): Record<string, unknown>[] => {
    if (kind === "custom" && caches.custom?.values) return toCollectionItems(caches.custom.values);
    if (kind === "builtin" && caches.builtin?.values) return toCollectionItems(caches.builtin.values);
    return toCollectionItems(draft.value ?? committedValues);
  };

  const base: CollectionEditorSnapshot = {
    kind,
    fixedLength,
    items: itemsForActiveKind(),
    jsonPaste: caches.custom?.jsonPaste ?? "",
    catalog: "products",
    sortPolicy:
      caches.builtin?.sortPolicy ??
      (ds.type === "remote" && ds.provider === "builtin"
        ? readSortPolicyFromBuiltinDataSource(ds)
        : { kind: "regular", sort: resolveBuiltinSortFromDataSource(ds) }),
  };

  if (ds.type === "remote" && ds.provider === "builtin") {
    base.catalog = ds.catalog ?? draft.collectionSources?.builtin?.catalog ?? "products";
    base.sortPolicy = readSortPolicyFromBuiltinDataSource(ds);
    base.productConfig =
      ds.productConfig ??
      draft.collectionSources?.builtin?.productConfig ??
      DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG;
    base.albumConfig =
      ds.albumConfig ??
      draft.collectionSources?.builtin?.albumConfig ??
      DEFAULT_BUILTIN_ALBUM_LIST_CONFIG;
  } else if (draft.collectionSources?.builtin?.catalog) {
    base.catalog = draft.collectionSources.builtin.catalog;
    base.productConfig = draft.collectionSources.builtin.productConfig;
    base.albumConfig = draft.collectionSources.builtin.albumConfig;
  }

  return base;
}

function refreshBuiltinPreviewItems(
  snapshot: CollectionEditorSnapshot,
  itemFields: BindingCollectionField[],
  payload: EmailPayload,
  slotId: string
): CollectionEditorSnapshot {
  if (snapshot.kind !== "builtin") return snapshot;
  const items = builtinPreviewItemsForSlot(
    snapshot.catalog,
    itemFields,
    snapshot.fixedLength,
    regularSortFromPolicy(snapshot.sortPolicy),
    {
      payload: {
        ...payload,
        slots: {
          ...payload.slots,
          [slotId]: {
            ...payload.slots[slotId],
            dataSource: kindToDataSource(
              "builtin",
              snapshot.catalog,
              snapshot.sortPolicy,
              snapshot.productConfig,
              snapshot.albumConfig
            ),
          },
        },
      },
      slotId,
      sortPolicy: snapshot.sortPolicy,
    }
  );
  return { ...snapshot, items };
}

/** 内置商品列表场景配置变更并刷新预览 */
export function applyBuiltinProductConfigToDraft(
  draft: PayloadSlotDraft,
  snapshot: CollectionEditorSnapshot,
  itemFields: BindingCollectionField[],
  productConfig: BuiltinProductListConfig,
  payload: EmailPayload,
  slotId: string
): PayloadSlotDraft {
  if (snapshot.kind !== "builtin") return draft;
  const nextSnap = refreshBuiltinPreviewItems(
    { ...snapshot, productConfig: normalizeBuiltinProductListConfig(productConfig) },
    itemFields,
    payload,
    slotId
  );
  return patchCollectionDraftSnapshot(draft, nextSnap);
}

/** 内置专辑列表场景配置变更并刷新预览 */
export function applyBuiltinAlbumConfigToDraft(
  draft: PayloadSlotDraft,
  snapshot: CollectionEditorSnapshot,
  itemFields: BindingCollectionField[],
  albumConfig: BuiltinAlbumListConfig,
  payload: EmailPayload,
  slotId: string
): PayloadSlotDraft {
  if (snapshot.kind !== "builtin") return draft;
  const nextSnap = refreshBuiltinPreviewItems(
    { ...snapshot, albumConfig: normalizeBuiltinAlbumListConfig(albumConfig) },
    itemFields,
    payload,
    slotId
  );
  return patchCollectionDraftSnapshot(draft, nextSnap);
}

/** 内置数据源下切换 catalog 并刷新预览行 */
export function applyBuiltinCollectionCatalogToDraft(
  draft: PayloadSlotDraft,
  snapshot: CollectionEditorSnapshot,
  itemFields: BindingCollectionField[],
  catalog: BuiltinCollectionCatalogId,
  payload: EmailPayload,
  slotId: string
): PayloadSlotDraft {
  if (snapshot.kind !== "builtin") return draft;
  const nextSnap = refreshBuiltinPreviewItems({ ...snapshot, catalog }, itemFields, payload, slotId);
  return patchCollectionDraftSnapshot(draft, nextSnap);
}

/** 内置数据源下更新排序/派生策略并刷新预览行 */
export function applyBuiltinCollectionSortPolicyToDraft(
  draft: PayloadSlotDraft,
  snapshot: CollectionEditorSnapshot,
  itemFields: BindingCollectionField[],
  sortPolicy: NormalizedBuiltinSortPolicy,
  payload: EmailPayload,
  slotId: string
): PayloadSlotDraft {
  if (snapshot.kind !== "builtin") return draft;
  const nextSnap = refreshBuiltinPreviewItems(
    { ...snapshot, sortPolicy },
    itemFields,
    payload,
    slotId
  );
  return patchCollectionDraftSnapshot(draft, nextSnap);
}
