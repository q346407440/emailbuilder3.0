import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { readFieldDisplay } from "./applyEdit";
import { containsThemeRefDeep, isThemeDetached, readTemplateFieldOnly } from "./themeBindingEdit";
import { variableBindingSpec } from "./variableBindingEdit";

/**
 * Inspector 控件展示用：与画布一致的字面量（解析主题、处理变量解除后的合并结果）。
 *
 * @param template 传入时可识别「已解除跟随主题」路径，优先展示模板内字面量（与解除后可编辑态一致）。
 */
export function readInspectorDisplayValue(
  block: EmailBlock,
  payload: EmailPayload,
  mergedBlock: EmailBlock | null | undefined,
  bindPath: string,
  template?: EmailTemplate | null
): unknown {
  if (template && isThemeDetached(template, block.id, bindPath)) {
    return readTemplateFieldOnly(block, bindPath);
  }
  if (!mergedBlock) return readFieldDisplay(block, payload, bindPath);
  const spec = variableBindingSpec(block, bindPath);
  const varDetached = spec && payload.detachedVariableSlotIds?.includes(spec.slotId);
  const rawOnly = readTemplateFieldOnly(block, bindPath);
  if (varDetached || containsThemeRefDeep(rawOnly)) {
    return readTemplateFieldOnly(mergedBlock, bindPath);
  }
  return readFieldDisplay(block, payload, bindPath);
}
