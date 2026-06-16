import type { EmailBlock } from "../types/email";
import {
  getVisibilityOperatorsForValueType,
  VISIBILITY_CONDITION_VALUE_TYPES,
} from "../visibility-contract";
import {
  isStandardScalarValueType,
  standardScalarValueTypeLabel,
} from "./standard-scalar-types";
import type { SlotValueType } from "./types";

/**
 * 变量字段绑定兼容规则目录（唯一真源）。
 * UI 变量选择器筛选、Inspector 绑定提交、validateTemplateBindings 须与此一致。
 *
 * 列表重复行模板内：绑定 spec.valueType 仍为 collection，兼容校验须用
 * `resolveEffectiveBindingSlotValueType`（见 repeat-list-item-binding.ts）解析 itemField 类型。
 */
export const VARIABLE_SLOT_BINDING_RULES = [
  {
    purpose: "contentText",
    allowedSlotTypes: ["string", "number", "url"],
    summary: "通用文本输入：文本/数值/链接变量均可（链接可当文本展示）",
  },
  {
    purpose: "contentButtonText",
    allowedSlotTypes: ["string", "number"],
    summary: "按钮文案 props.text：仅文本/数值，禁止链接类变量",
  },
  {
    purpose: "contentUrl",
    allowedSlotTypes: ["url", "string"],
    summary: "链接字段（含按钮 props.link、.link/.href）",
  },
  {
    purpose: "contentImage",
    allowedSlotTypes: ["image", "url"],
    summary: "图片地址字段（.src 等）",
  },
  {
    purpose: "contentNumber",
    allowedSlotTypes: ["number"],
    summary: "数值专用字段",
  },
  {
    purpose: "contentColor",
    allowedSlotTypes: ["color"],
    summary: "颜色字段",
  },
  {
    purpose: "inlineText",
    allowedSlotTypes: ["string", "number", "url"],
    summary: "正文文中变量（文本 run）",
  },
  {
    purpose: "inlineUrl",
    allowedSlotTypes: ["url", "string"],
    summary: "正文链接 run",
  },
  {
    purpose: "visibility",
    allowedSlotTypes: [...VISIBILITY_CONDITION_VALUE_TYPES, "object"],
    summary: "区块显隐条件：标量/列表变量，以及对象变量的标量字段；不含颜色型业务变量",
  },
] as const;

/** 字段绑定所需的 valueType（由 bindPath / 字面量推断） */
export type BindingValueTypeRequirement =
  | "string"
  | "url"
  | "image"
  | "color"
  | "number"
  | "boolean"
  | "collection";

/** 变量选择弹窗的筛选场景（与 VARIABLE_SLOT_BINDING_RULES.purpose 对齐） */
export type VariablePickerPurpose =
  | "contentText"
  | "contentButtonText"
  | "contentUrl"
  | "contentImage"
  | "contentNumber"
  | "contentColor"
  | "inlineText"
  | "inlineUrl"
  | "visibility";

/** 通用文本输入是否允许绑定「链接」类 payload 变量（按钮文案除外） */
export function allowsUrlVariableOnTextField(block: EmailBlock, bindPath: string): boolean {
  if (block.type === "button" && bindPath === "props.text") return false;
  return true;
}

/** 由 bindPath 推断绑定所需类型（路径优先；通用文本路径不因数字字面量升为 number） */
export function inferBindingValueTypeRequirement(
  block: EmailBlock,
  bindPath: string,
  literal?: unknown
): BindingValueTypeRequirement {
  if (bindPath.endsWith(".src")) return "image";
  if (bindPath.endsWith(".link") || bindPath.endsWith(".href")) return "url";
  if (bindPath.endsWith(".color") || bindPath.endsWith("Color")) return "color";
  if (block.type === "image" && bindPath === "wrapperStyle.backgroundImage.src") return "image";
  if (block.type === "icon" && bindPath === "props.src") return "image";

  if (literal !== undefined && literal !== null && typeof literal === "number" && Number.isFinite(literal)) {
    return "number";
  }
  if (typeof literal === "boolean") return "boolean";
  return "string";
}

export function inferVariablePickerPurpose(
  block: EmailBlock,
  bindPath: string,
  literal?: unknown
): VariablePickerPurpose {
  if (block.type === "button" && bindPath === "props.text") {
    return "contentButtonText";
  }
  if (block.type === "button" && bindPath === "props.link") {
    return "contentUrl";
  }

  const required = inferBindingValueTypeRequirement(block, bindPath, literal);
  switch (required) {
    case "url":
      return "contentUrl";
    case "image":
      return "contentImage";
    case "number":
      return "contentNumber";
    case "color":
      return "contentColor";
    case "boolean":
      return "contentText";
    default:
      return "contentText";
  }
}

const PURPOSE_ALLOWED_SLOT_TYPES: Record<VariablePickerPurpose, readonly string[]> = {
  contentText: ["string", "number", "url"],
  contentButtonText: ["string", "number"],
  contentUrl: ["url", "string"],
  contentImage: ["image", "url"],
  contentNumber: ["number"],
  contentColor: ["color"],
  inlineText: ["string", "number", "url"],
  inlineUrl: ["url", "string"],
  visibility: [...VISIBILITY_CONDITION_VALUE_TYPES, "object"],
};

export function slotValueTypeMatchesPickerPurpose(
  slotValueType: string,
  purpose: VariablePickerPurpose
): boolean {
  const allowed = PURPOSE_ALLOWED_SLOT_TYPES[purpose];
  if (allowed.includes(slotValueType)) return true;
  if (purpose === "visibility") {
    return getVisibilityOperatorsForValueType(slotValueType as SlotValueType).length > 0;
  }
  return false;
}

export type BindingRequirementContext = {
  block: EmailBlock;
  bindPath: string;
};

/** 绑定提交 / 校验：payload 槽类型是否满足字段所需类型 */
export function slotValueTypeMatchesBindingRequirement(
  slotValueType: string,
  required: BindingValueTypeRequirement,
  context?: BindingRequirementContext
): boolean {
  if (slotValueType === required) return true;
  switch (required) {
    case "string":
      if (slotValueType === "url") {
        return context
          ? allowsUrlVariableOnTextField(context.block, context.bindPath)
          : true;
      }
      return slotValueType === "number" || slotValueType === "string";
    case "url":
      return slotValueType === "string" || slotValueType === "url";
    case "image":
      return slotValueType === "url" || slotValueType === "image";
    case "number":
      return slotValueType === "number";
    case "color":
      return slotValueType === "color";
    case "boolean":
      return slotValueType === "boolean";
    case "collection":
      return slotValueType === "collection";
    default:
      return false;
  }
}

export function bindingRequirementLabel(required: BindingValueTypeRequirement): string {
  switch (required) {
    case "string":
      return "文本";
    case "url":
      return "链接";
    case "image":
      return "图片";
    case "number":
      return "数值";
    case "color":
      return "颜色";
    case "boolean":
      return "布尔";
    case "collection":
      return "列表";
    default:
      return required;
  }
}

export function slotValueTypeLabelForPicker(slotValueType: string): string {
  if (isStandardScalarValueType(slotValueType)) {
    return standardScalarValueTypeLabel(slotValueType);
  }
  switch (slotValueType) {
    case "image":
      return "图片";
    case "color":
      return "颜色";
    case "boolean":
      return "布尔";
    case "collection":
      return "列表";
    default:
      return slotValueType;
  }
}

export function filterSlotsForVariablePicker<T extends { valueType: string }>(
  slots: T[],
  purpose: VariablePickerPurpose
): T[] {
  return slots.filter((slot) => slotValueTypeMatchesPickerPurpose(slot.valueType, purpose));
}

export function filterSlotsForVisibilityPicker<T extends { valueType: string }>(
  slots: T[]
): T[] {
  return filterSlotsForVariablePicker(slots, "visibility");
}

/** validateTemplateBindings：variable 绑定与字段类型不兼容时返回 issue */
export function validateVariableBindingFieldCompatibility(
  block: EmailBlock,
  bindPath: string,
  bindingValueType: string
): { pathSuffix: string; reason: string } | null {
  const required = inferBindingValueTypeRequirement(block, bindPath);
  if (
    slotValueTypeMatchesBindingRequirement(bindingValueType, required, {
      block,
      bindPath,
    })
  ) {
    return null;
  }
  return {
    pathSuffix: "valueType",
    reason: `变量类型「${bindingValueType}」与字段所需「${bindingRequirementLabel(required)}」不兼容（见 payload-contract/variable-slot-compatibility）`,
  };
}
