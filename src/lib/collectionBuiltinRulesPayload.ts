import type { CollectionDataSource } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  normalizeBuiltinCollectionExtract,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import type { BuiltinCollectionSortId } from "../payload-contract/collection-builtin-sort";
import type { EmailPayload } from "../types/email";
import {
  patchPayloadCollectionSlot,
  resolveCollectionFixedLength,
  resolveCollectionPreviewItems,
} from "./collectionDataSource";
import { applyBuiltinCollectionResolves } from "./resolveBuiltinCollectionItems";

function isBuiltinCollectionSlot(payload: EmailPayload, slotId: string): boolean {
  const ds = payload.slots[slotId]?.dataSource;
  return ds?.type === "remote" && ds.provider === "builtin";
}

function refreshBuiltinCollectionSlotValues(
  payload: EmailPayload,
  slotId: string,
  dataSource: CollectionDataSource
): EmailPayload {
  const entry = payload.slots[slotId];
  if (!entry || entry.valueType !== "collection") return payload;

  const itemFields = entry.itemFields ?? [];
  const fixedLength = resolveCollectionFixedLength(entry.minItems, entry.maxItems);

  let next = patchPayloadCollectionSlot(payload, slotId, { dataSource });
  const preview = resolveCollectionPreviewItems(dataSource, itemFields, fixedLength, next, slotId);
  if (preview.ok) {
    next = patchPayloadCollectionSlot(next, slotId, { values: preview.items });
  }
  return applyBuiltinCollectionResolves(next);
}

function normalizeBuiltinDataSourcePatch(
  ds: CollectionDataSource & { type: "remote"; provider: "builtin" }
): CollectionDataSource {
  const extract = normalizeBuiltinCollectionExtract(ds.extract);
  return {
    ...ds,
    extract: extract.kind === "similarTo" ? extract : undefined,
  };
}

/** 更新已提交 payload 上 builtin 列表槽的排序 */
export function patchPayloadBuiltinCollectionSort(
  payload: EmailPayload,
  slotId: string,
  sort: BuiltinCollectionSortId
): EmailPayload {
  if (!isBuiltinCollectionSlot(payload, slotId)) return payload;
  const entry = payload.slots[slotId]!;
  const ds = entry.dataSource!;
  if (ds.type !== "remote" || ds.provider !== "builtin") return payload;
  return refreshBuiltinCollectionSlotValues(payload, slotId, { ...ds, sort });
}

/** 更新 extract（相似品等衍生） */
export function patchPayloadBuiltinCollectionExtract(
  payload: EmailPayload,
  slotId: string,
  extract: BuiltinCollectionExtract
): EmailPayload {
  if (!isBuiltinCollectionSlot(payload, slotId)) return payload;
  const entry = payload.slots[slotId]!;
  const ds = entry.dataSource!;
  if (ds.type !== "remote" || ds.provider !== "builtin") return payload;
  const normalized = normalizeBuiltinCollectionExtract(extract);
  return refreshBuiltinCollectionSlotValues(
    payload,
    slotId,
    normalizeBuiltinDataSourcePatch({
      ...ds,
      extract: normalized.kind === "similarTo" ? normalized : undefined,
    })
  );
}

export function isPayloadBuiltinCollectionSlot(payload: EmailPayload, slotId: string): boolean {
  return isBuiltinCollectionSlot(payload, slotId);
}
