import type { BindingCollectionField, EmailTemplate } from "../types/email";
import { isCollectionField } from "../payload-contract/collection-item-fields";
import {
  buildRepeatPrototypeIdSet,
  isMaterializedRepeatRowBlockId,
  resolveMaterializedRowToPrototypeId,
} from "./repeatRegion";

/** 用户可见文案：去掉区块名等遗留的 repeat 英文标记 */
export function sanitizeListRepeatUserLabel(text: string): string {
  return text
    .replace(/[（(]\s*repeat\s*[）)]/gi, "")
    .replace(/\brepeat\b/gi, "")
    .trim()
    .replace(/\s{2,}/g, " ");
}

export type RepeatPrototypePickerOption = {
  key: string;
  hostId: string;
  prototypeChildIds: string[];
  label: string;
  modeLabel: string;
  description: string;
};

export type RepeatPrototypeOptionLike = {
  key: string;
  hostId: string;
  prototypeChildIds: string[];
  label: string;
  description: string;
  source: "container" | "leaf-self" | "leaf-parent" | "global";
};

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  const raw = template.blockMeta?.[blockId]?.name?.trim() || blockId;
  return sanitizeListRepeatUserLabel(raw);
}

/** 父级/子级行模板树表：复制方式列文案 */
export function repeatPrototypeSourceModeLabel(
  source: RepeatPrototypeOptionLike["source"]
): string {
  switch (source) {
    case "container":
      return "容器子区块";
    case "leaf-self":
      return "仅复制当前区块";
    case "leaf-parent":
      return "连同父容器一起复制";
    default:
      return "行模板";
  }
}

/** Inspector 行模板选项 → 树表选项（含 modeLabel） */
export function repeatPrototypeOptionsToPickerOptions(
  template: EmailTemplate,
  options: RepeatPrototypeOptionLike[]
): RepeatPrototypePickerOption[] {
  return options.map((opt) => {
    const anchorId = opt.prototypeChildIds[opt.prototypeChildIds.length - 1] ?? "";
    return {
      key: opt.key,
      hostId: opt.hostId,
      prototypeChildIds: opt.prototypeChildIds,
      label: anchorId ? blockDisplayName(template, anchorId) : opt.label,
      modeLabel: repeatPrototypeSourceModeLabel(opt.source),
      description: opt.description,
    };
  });
}

/** 父级列表字段映射表仅展示标量列（子列表列由子级循环容器处理） */
export function parentScalarItemFieldsFromItemFields(
  itemFields: BindingCollectionField[]
): BindingCollectionField[] {
  return itemFields.filter((field) => !isCollectionField(field));
}

export type RepeatCollectionCandidateLike = {
  key: string;
  slotId: string;
  label: string;
};

/**
 * 同模块多列表变量时，优先与宿主区块语义一致的槽（如 rfj-picked-spotlight → pickedSpotlightProduct）。
 */
export function pickRepeatCollectionCandidateForHost(
  candidates: RepeatCollectionCandidateLike[],
  hostBlockId: string,
  preferredSlotId?: string
): RepeatCollectionCandidateLike | undefined {
  if (!candidates.length) return undefined;
  if (preferredSlotId) {
    const hit = candidates.find((c) => c.key === preferredSlotId);
    if (hit) return hit;
  }
  if (hostBlockId.includes("picked-spotlight")) {
    const spotlight = candidates.find((c) => c.slotId === "pickedSpotlightProduct");
    if (spotlight) return spotlight;
  }
  const hostToken = hostBlockId.split("-").pop()?.toLowerCase() ?? "";
  if (hostToken) {
    const semantic = candidates.find((c) => {
      const slot = c.slotId.toLowerCase();
      const label = c.label.toLowerCase();
      return slot.includes(hostToken) || label.includes("主推");
    });
    if (semantic) return semantic;
  }
  return candidates[0];
}

/** 物化行模板选择器：应用后将归一为的原型 id 副文案 */
export function repeatPrototypePickerCanonicalHint(
  template: EmailTemplate,
  blockId: string
): string | null {
  if (!isMaterializedRepeatRowBlockId(blockId, template)) return null;
  const canonical = resolveMaterializedRowToPrototypeId(
    blockId,
    buildRepeatPrototypeIdSet(template),
    template
  );
  if (canonical === blockId) return null;
  const name = template.blockMeta?.[canonical]?.name?.trim() || canonical;
  return `应用后将归一为 ${name}`;
}
