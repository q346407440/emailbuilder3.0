import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { resolveRepeatListItemFieldBinding } from "./repeatListItemField";
import { hasThemeRefInTemplateField, isThemeDetached } from "./themeBindingEdit";
import { variableBindingSpec } from "./variableBindingEdit";

export type InspectFieldBindMode =
  | "free"
  | "variableFollow"
  | "variableDetached"
  | "themeFollow"
  | "themeDetached";

/** 跟随主题或可替换内容时，禁止直接改模板/赋值（由工具栏跳转或解除跟随） */
export function isInspectFollowLocked(
  template: EmailTemplate,
  block: EmailBlock,
  payload: EmailPayload,
  bindPath: string
): boolean {
  const m = getInspectFieldBindMode(template, block, payload, block.id, bindPath);
  return m === "themeFollow" || m === "variableFollow";
}

export function getInspectFieldBindMode(
  template: EmailTemplate,
  block: EmailBlock,
  payload: EmailPayload,
  blockId: string,
  bindPath: string
): InspectFieldBindMode {
  if (resolveRepeatListItemFieldBinding(template, blockId, bindPath)) {
    return "variableFollow";
  }
  const vs = variableBindingSpec(block, bindPath);
  if (vs) {
    if (payload.detachedVariableSlotIds?.includes(vs.slotId)) return "variableDetached";
    return "variableFollow";
  }
  /**
   * 解除跟随主题后会在 meta 记入 themeRestoreJson；若合并预览未能烘焙出字面量，
   * detach 可能仍写回含 $themeRef 的 raw。必须先识别「已解除」态，否则会一直判为 themeFollow 导致控件永远锁定。
   */
  if (isThemeDetached(template, blockId, bindPath)) return "themeDetached";
  if (hasThemeRefInTemplateField(template, blockId, bindPath)) return "themeFollow";
  return "free";
}
