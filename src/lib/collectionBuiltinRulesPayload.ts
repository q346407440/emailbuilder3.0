import type { CollectionDataSource } from "../payload-contract/collection-data-source";
import {
  readSortPolicyFromBuiltinDataSource,
  writeSortPolicyToDataSource,
  type NormalizedBuiltinSortPolicy,
} from "../payload-contract/collection-builtin-sort-policy";
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
  ds: CollectionDataSource & { type: "remote"; provider: "builtin" },
  sortPolicy: NormalizedBuiltinSortPolicy
): CollectionDataSource {
  return {
    ...ds,
    sort: writeSortPolicyToDataSource(sortPolicy),
  };
}

/** 更新已提交 payload 上 builtin 列表槽的排序/派生策略 */
export function patchPayloadBuiltinCollectionSortPolicy(
  payload: EmailPayload,
  slotId: string,
  sortPolicy: NormalizedBuiltinSortPolicy
): EmailPayload {
  if (!isBuiltinCollectionSlot(payload, slotId)) return payload;
  const entry = payload.slots[slotId]!;
  const ds = entry.dataSource!;
  if (ds.type !== "remote" || ds.provider !== "builtin") return payload;
  return refreshBuiltinCollectionSlotValues(
    payload,
    slotId,
    normalizeBuiltinDataSourcePatch(ds, sortPolicy)
  );
}

export function isPayloadBuiltinCollectionSlot(payload: EmailPayload, slotId: string): boolean {
  return isBuiltinCollectionSlot(payload, slotId);
}

export function readCommittedBuiltinSortPolicy(
  payload: EmailPayload,
  slotId: string
): NormalizedBuiltinSortPolicy | null {
  const ds = payload.slots[slotId]?.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return null;
  return readSortPolicyFromBuiltinDataSource(ds);
}
