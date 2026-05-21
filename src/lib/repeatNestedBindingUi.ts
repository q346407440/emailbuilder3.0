import type { BindingCollectionField, EmailTemplate } from "../types/email";
import { isCollectionField } from "../payload-contract/collection-item-fields";

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
