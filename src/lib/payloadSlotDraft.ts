import type {
  BuiltinAlbumListConfig,
  BuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import type {
  BuiltinCollectionCatalogId,
  CollectionDataSource,
} from "../payload-contract/collection-data-source";
import { defaultCollectionDataSource } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  normalizeBuiltinCollectionExtract,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import type { BindingCollectionField, EmailPayload, PayloadSlotDefinition } from "../types/email";
import {
  buildDefaultCollectionFieldMap,
  echoCustomJsonPaste,
  hasNonEmptyCollectionItems,
} from "./collectionFieldMapping";
import {
  builtinPreviewItemsForSlot,
  emptyValueForField,
  patchPayloadCollectionSlot,
  resolveCollectionFixedLength,
} from "./collectionDataSource";
import { applyBuiltinCollectionResolves } from "./resolveBuiltinCollectionItems";
import { applyCollectionDisplayRule } from "./collectionDisplayRule";

export type CollectionDataSourceKind = "custom" | "builtin";

export type CollectionCustomSourceDraft = {
  values: Record<string, unknown>[];
  jsonPaste?: string;
  /** 该 tab 下的字段关联（会话内，应用前不入库） */
  fieldMap?: Record<string, string>;
};

export type CollectionBuiltinSourceDraft = {
  values: Record<string, unknown>[];
  catalog: BuiltinCollectionCatalogId;
  sort?: BuiltinCollectionSortId;
  extract?: BuiltinCollectionExtract;
  productConfig?: BuiltinProductListConfig;
  albumConfig?: BuiltinAlbumListConfig;
  fieldMap?: Record<string, string>;
};

export type CollectionSourceDraftCache = {
  custom?: CollectionCustomSourceDraft;
  builtin?: CollectionBuiltinSourceDraft;
};

export type PayloadSlotDraft = {
  label?: string;
  slotDefPatch?: Partial<PayloadSlotDefinition>;
  value?: unknown;
  /** collection：自定义 / 内置两套数据源草稿 */
  collectionSources?: CollectionSourceDraftCache;
  activeCollectionSource?: CollectionDataSourceKind;
  /** collection：样本 JSON 字段 → itemFields.key 的关联（会话内，应用解析时使用） */
  collectionFieldMap?: Record<string, string>;
};

export type PayloadSlotDraftMap = Record<string, PayloadSlotDraft>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function toCollectionItems(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (isRecord(item) ? item : {}));
}

export function collectionDataSourceKind(ds: CollectionDataSource | undefined): CollectionDataSourceKind {
  const normalized = ds ?? defaultCollectionDataSource();
  if (normalized.type === "custom") return "custom";
  if (normalized.type === "remote" && normalized.provider === "builtin") return "builtin";
  return "custom";
}

function padItems(
  items: Record<string, unknown>[],
  fixedLength: number,
  itemFields: BindingCollectionField[]
): Record<string, unknown>[] {
  const next = items.slice(0, fixedLength).map((row) => ({ ...row }));
  while (next.length < fixedLength) {
    next.push(Object.fromEntries(itemFields.map((f) => [f.key, emptyValueForField(f)])));
  }
  return next;
}

/** 从已提交的 payload 初始化 collection 槽草稿（含两套数据源缓存） */
export function seedCollectionSlotDraft(
  payload: EmailPayload,
  slotId: string,
  itemFields: BindingCollectionField[]
): PayloadSlotDraft {
  const entry = payload.slots[slotId];
  const fixedLength = resolveCollectionFixedLength(entry?.minItems, entry?.maxItems);
  const committedItems = padItems(toCollectionItems(payload.values[slotId]), fixedLength, itemFields);
  const rawDs = entry?.dataSource ?? defaultCollectionDataSource();
  const active = collectionDataSourceKind(rawDs);
  const ds: CollectionDataSource =
    active === "builtin" && rawDs.type === "remote" && rawDs.provider === "builtin"
      ? rawDs
      : { type: "custom" };

  const customJsonPaste =
    active === "custom" ? echoCustomJsonPaste(committedItems) : "";

  const sourceKeys = committedItems[0] ? Object.keys(committedItems[0]) : [];
  const defaultFieldMap =
    hasNonEmptyCollectionItems(committedItems) && active === "custom"
      ? buildDefaultCollectionFieldMap(itemFields, sourceKeys)
      : {};

  const catalog: BuiltinCollectionCatalogId =
    ds.type === "remote" && ds.provider === "builtin" ? ds.catalog : "products";
  const builtinSort =
    ds.type === "remote" && ds.provider === "builtin"
      ? (ds.sort ?? DEFAULT_BUILTIN_COLLECTION_SORT)
      : DEFAULT_BUILTIN_COLLECTION_SORT;
  const builtinExtract =
    ds.type === "remote" && ds.provider === "builtin"
      ? normalizeBuiltinCollectionExtract(ds.extract)
      : DEFAULT_BUILTIN_COLLECTION_EXTRACT;

  const caches: CollectionSourceDraftCache = {
    custom: {
      values: structuredClone(committedItems),
      jsonPaste: customJsonPaste,
      ...(active === "custom" && Object.keys(defaultFieldMap).length > 0
        ? { fieldMap: { ...defaultFieldMap } }
        : {}),
    },
    builtin: {
      catalog,
      sort: builtinSort,
      extract: builtinExtract,
      values:
        active === "builtin"
          ? structuredClone(committedItems)
          : builtinPreviewItemsForSlot(catalog, itemFields, fixedLength, builtinSort, {
              payload,
              slotId,
              extract: builtinExtract,
            }),
    },
  };

  const activeFieldMap =
    active === "custom" ? caches.custom?.fieldMap : caches.builtin?.fieldMap;

  return {
    label: entry?.label,
    slotDefPatch: {
      minItems: entry?.minItems,
      maxItems: entry?.maxItems,
      dataSource: ds,
      displayRule: entry?.displayRule,
      itemFields: entry?.itemFields,
    },
    value: structuredClone(committedItems),
    collectionSources: caches,
    activeCollectionSource: active,
    ...(activeFieldMap && Object.keys(activeFieldMap).length > 0
      ? { collectionFieldMap: { ...activeFieldMap } }
      : {}),
  };
}

export function hasPayloadSlotDraft(drafts: PayloadSlotDraftMap, slotId: string): boolean {
  return Boolean(drafts[slotId]);
}

function stableJsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** 草稿相对已写入内存的 payload 是否有实质改动（仅切换数据源缓存、值未变不算） */
export function isPayloadSlotDraftDirty(
  committed: EmailPayload,
  slotId: string,
  draft: PayloadSlotDraft
): boolean {
  const entry = committed.slots[slotId];
  if (!entry) return true;

  if (draft.label !== undefined) {
    const nextLabel = draft.label.trim();
    const committedLabel = (entry.label ?? "").trim();
    if (nextLabel !== committedLabel) return true;
  }

  if (draft.value !== undefined && !stableJsonEqual(draft.value, committed.values[slotId])) {
    return true;
  }

  if (draft.slotDefPatch) {
    const patch = draft.slotDefPatch;
    const hasDisplayRulePatch = Object.prototype.hasOwnProperty.call(patch, "displayRule");
    if (patch.minItems !== undefined && patch.minItems !== entry.minItems) return true;
    if (patch.maxItems !== undefined && patch.maxItems !== entry.maxItems) return true;
    if (patch.itemFields !== undefined && !stableJsonEqual(patch.itemFields, entry.itemFields ?? [])) {
      return true;
    }
    if (patch.dataSource !== undefined) {
      const committedDs = entry.dataSource ?? defaultCollectionDataSource();
      if (!stableJsonEqual(patch.dataSource, committedDs)) return true;
    }
    if (hasDisplayRulePatch) {
      const nextRule = patch.displayRule;
      const committedRule = entry.displayRule;
      if (!stableJsonEqual(nextRule, committedRule)) return true;
    }
  }

  return false;
}

export function getDirtyPayloadSlotDraftIds(
  committed: EmailPayload,
  drafts: PayloadSlotDraftMap
): string[] {
  return Object.keys(drafts).filter((slotId) =>
    isPayloadSlotDraftDirty(committed, slotId, drafts[slotId]!)
  );
}

export function hasDirtyPayloadSlotDrafts(
  committed: EmailPayload,
  drafts: PayloadSlotDraftMap
): boolean {
  return getDirtyPayloadSlotDraftIds(committed, drafts).length > 0;
}

/** 画布预览：已提交 payload + 各槽未保存草稿 */
export function buildPreviewPayload(
  committed: EmailPayload,
  drafts: PayloadSlotDraftMap
): EmailPayload {
  let next: EmailPayload =
    Object.keys(drafts).length === 0
      ? committed
      : (() => {
          const merged: EmailPayload = {
            ...committed,
            slots: { ...committed.slots },
            values: { ...committed.values },
          };

          for (const [slotId, draft] of Object.entries(drafts)) {
            const entry = merged.slots[slotId];
            if (!entry) continue;

            if (draft.label?.trim()) {
              merged.slots[slotId] = { ...entry, label: draft.label.trim() };
            }
            if (draft.slotDefPatch) {
              merged.slots[slotId] = { ...merged.slots[slotId], ...draft.slotDefPatch };
            }
            if (draft.value !== undefined) {
              merged.values[slotId] = structuredClone(draft.value);
            }
          }

          return merged;
        })();

  next = applyBuiltinCollectionResolves(next);
  const withDisplayRule: EmailPayload = {
    ...next,
    values: { ...next.values },
  };
  for (const [slotId, slotDef] of Object.entries(withDisplayRule.slots)) {
    if (slotDef.valueType !== "collection" || !slotDef.displayRule || !slotDef.sceneCollectionPresetId) {
      continue;
    }
    const current = toCollectionItems(withDisplayRule.values[slotId]);
    withDisplayRule.values[slotId] = applyCollectionDisplayRule(current, slotDef.displayRule);
  }
  return withDisplayRule;
}

/** 将单槽草稿合并进已提交 payload（保存变量） */
export function commitPayloadSlotDraft(
  committed: EmailPayload,
  slotId: string,
  draft: PayloadSlotDraft
): EmailPayload {
  let next = structuredClone(committed);
  const entry = next.slots[slotId];
  if (!entry) return committed;

  if (draft.label?.trim()) {
    next.slots[slotId] = { ...entry, label: draft.label.trim() };
  }

  if (draft.slotDefPatch) {
    next.slots[slotId] = { ...next.slots[slotId], ...draft.slotDefPatch };
  }

  if (draft.value !== undefined) {
    next.values = { ...next.values, [slotId]: structuredClone(draft.value) };
  }

  if (entry.valueType === "collection") {
    const hasDisplayRulePatch = Object.prototype.hasOwnProperty.call(
      draft.slotDefPatch ?? {},
      "displayRule"
    );
    const hasCollectionPatch =
      draft.slotDefPatch?.dataSource !== undefined ||
      hasDisplayRulePatch ||
      draft.slotDefPatch?.itemFields !== undefined ||
      draft.slotDefPatch?.minItems !== undefined ||
      draft.value !== undefined;
    if (hasCollectionPatch) {
      next = patchPayloadCollectionSlot(next, slotId, {
        dataSource: draft.slotDefPatch?.dataSource,
        displayRule: draft.slotDefPatch?.displayRule,
        itemFields: draft.slotDefPatch?.itemFields,
        values: draft.value as Record<string, unknown>[] | undefined,
        fixedLength:
          draft.slotDefPatch?.minItems === draft.slotDefPatch?.maxItems
            ? draft.slotDefPatch.minItems
            : undefined,
      });
    }
  }

  return next;
}

export function discardPayloadSlotDraft(
  drafts: PayloadSlotDraftMap,
  slotId: string
): PayloadSlotDraftMap {
  if (!drafts[slotId]) return drafts;
  const next = { ...drafts };
  delete next[slotId];
  return next;
}

export function getEffectiveSlotValue(
  committed: EmailPayload,
  drafts: PayloadSlotDraftMap,
  slotId: string
): unknown {
  const draft = drafts[slotId];
  if (draft?.value !== undefined) return draft.value;
  return committed.values[slotId];
}

export function getEffectiveSlotLabel(
  committed: EmailPayload,
  drafts: PayloadSlotDraftMap,
  slotId: string,
  fallback: string
): string {
  const draft = drafts[slotId];
  if (draft?.label?.trim()) return draft.label.trim();
  return committed.slots[slotId]?.label ?? fallback;
}
