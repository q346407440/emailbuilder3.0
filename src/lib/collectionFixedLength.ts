import type { EmailPayload } from "../types/email";
import {
  clampFixedLength,
  patchPayloadCollectionSlot,
  resolveCollectionFixedLength,
  resolveCollectionPreviewItems,
} from "./collectionDataSource";
import {
  isDerivedSortPolicy,
  readSortPolicyFromBuiltinDataSource,
} from "../payload-contract/collection-builtin-sort-policy";

export type CollectionFixedLengthEditability = {
  editable: boolean;
  reason?: string;
};

/** 列表固定长度是否可在 Inspector / 变量面板编辑（单真源：payload.slots min/max） */
export function collectionFixedLengthEditability(
  payload: EmailPayload,
  slotId: string,
  opts?: { nestedRepeatItemPath?: boolean }
): CollectionFixedLengthEditability {
  if (opts?.nestedRepeatItemPath) {
    return {
      editable: false,
      reason: "嵌套子列表行数随父项数据变化；请改父列表变量或子列表字段配置。",
    };
  }

  const entry = payload.slots[slotId];
  if (!entry || entry.valueType !== "collection") {
    return { editable: false, reason: "非列表变量。" };
  }

  const ds = entry.dataSource;
  if (ds?.type === "remote" && ds.provider === "builtin") {
    const policy = readSortPolicyFromBuiltinDataSource(ds);
    if (isDerivedSortPolicy(policy)) {
      const target = policy.targetSlotId.trim();
      return {
        editable: false,
        reason: target
          ? `相似品/搭配品列表长度随目标变量「${target}」与排序策略决定，请改目标列表长度。`
          : "相似品/搭配品列表须先配置目标变量，长度由目标列表决定。",
      };
    }
  }

  return { editable: true };
}

/** 写入 payload.slots 固定长度并同步 values（builtin 常规列表会重算预览数据） */
export function applyPayloadCollectionFixedLength(
  payload: EmailPayload,
  slotId: string,
  length: number
): EmailPayload {
  const entry = payload.slots[slotId];
  if (!entry || entry.valueType !== "collection") return payload;

  const len = clampFixedLength(length);
  const itemFields = entry.itemFields ?? [];

  let next = patchPayloadCollectionSlot(payload, slotId, { fixedLength: len });

  const ds = entry.dataSource;
  if (ds?.type === "remote" && ds.provider === "builtin") {
    const policy = readSortPolicyFromBuiltinDataSource(ds);
    if (!isDerivedSortPolicy(policy)) {
      const preview = resolveCollectionPreviewItems(ds, itemFields, len, next, slotId);
      if (preview.ok) {
        next = patchPayloadCollectionSlot(next, slotId, { values: preview.items });
      }
    }
  }

  return next;
}

export function readPayloadCollectionFixedLength(payload: EmailPayload, slotId: string): number {
  const entry = payload.slots[slotId];
  return resolveCollectionFixedLength(entry?.minItems, entry?.maxItems);
}
