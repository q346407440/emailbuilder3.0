import type { EmailPayload, EmailTemplate, RepeatRegionBinding } from "../types/email";
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
import { getPayloadSlotBuiltinStructure } from "./builtinStructureSlot";

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
  if (entry?.valueType === "object") {
    return { editable: false, reason: "对象变量无列表长度配置。" };
  }
  if (!entry || entry.valueType !== "collection") {
    return { editable: false, reason: "非列表变量。" };
  }

  const structure = getPayloadSlotBuiltinStructure(entry);
  if (structure?.lengthPolicy?.kind === "locked") {
    return {
      editable: false,
      reason: `该专用变量固定为 ${structure.lengthPolicy.fixedLength} 条，不可修改。`,
    };
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
  if (getPayloadSlotBuiltinStructure(entry)?.lengthPolicy?.kind === "locked") return payload;

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

/**
 * repeat 展开时的展示条数上限。
 * 顶层列表在槽声明了 min/max 时以 payload.slots 为真源，未声明则回落 repeat.maxItems；
 * 嵌套子列表（itemPath）仍用 repeat 绑定上的 maxItems。
 */
export function resolveRepeatExpansionMaxItems(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null
): number | undefined {
  if (repeat.itemPath?.trim()) {
    return typeof repeat.maxItems === "number" ? repeat.maxItems : undefined;
  }
  if (payload) {
    const slotDef = payload.slots?.[repeat.slotId];
    if (
      slotDef?.valueType === "collection" &&
      (slotDef.minItems !== undefined || slotDef.maxItems !== undefined)
    ) {
      return resolveCollectionFixedLength(slotDef.minItems, slotDef.maxItems);
    }
  }
  return typeof repeat.maxItems === "number" ? repeat.maxItems : undefined;
}

/** 将 payload 槽固定长度同步到 template 中所有引用该 slotId 的 repeat 绑定 */
export function syncTemplateRepeatBindingsFixedLength(
  template: EmailTemplate,
  slotId: string,
  length: number
): EmailTemplate {
  const len = clampFixedLength(length);
  let changed = false;
  const blocks = { ...template.blocks };
  for (const [blockId, block] of Object.entries(blocks)) {
    const repeat = block.repeat;
    if (repeat?.mode !== "collection" || repeat.slotId !== slotId) continue;
    if (repeat.minItems === len && repeat.maxItems === len) continue;
    blocks[blockId] = {
      ...block,
      repeat: { ...repeat, minItems: len, maxItems: len },
    };
    changed = true;
  }
  return changed ? { ...template, blocks } : template;
}

/** 列表固定长度变更：同步 payload.slots 与 template.repeat 绑定 */
export function applyCollectionFixedLengthChange(
  template: EmailTemplate,
  payload: EmailPayload,
  slotId: string,
  length: number
): { template: EmailTemplate; payload: EmailPayload } {
  const nextPayload = applyPayloadCollectionFixedLength(payload, slotId, length);
  const fixedLength = readPayloadCollectionFixedLength(nextPayload, slotId);
  return {
    template: syncTemplateRepeatBindingsFixedLength(template, slotId, fixedLength),
    payload: nextPayload,
  };
}
