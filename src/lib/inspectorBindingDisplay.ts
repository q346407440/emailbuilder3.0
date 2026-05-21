import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { isThemeRef, parseThemeRefPath } from "../types/themeRef";
import { readFieldDisplay } from "./applyEdit";
import { coercePersistedFontFamily, normalizeThemeFontFamilyInput } from "../font-family-contract";
import { readTokenPresetStorageValue } from "./resolveTokenPreset";
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

function readThemeFontStorageDisplay(
  block: EmailBlock,
  bindPath: string,
  tokenPresets: TokenPresets | null | undefined
): string | null {
  const binding = block.bindings?.[bindPath];
  if (binding?.mode === "theme" && binding.tokenPath) {
    const stored = readTokenPresetStorageValue(tokenPresets, binding.tokenPath);
    if (stored) return stored;
  }
  const rawTemplate = readTemplateFieldOnly(block, bindPath);
  if (isThemeRef(rawTemplate)) {
    const stored = readTokenPresetStorageValue(tokenPresets, parseThemeRefPath(rawTemplate));
    if (stored) return stored;
  }
  return null;
}

/**
 * Inspector 字体控件：主题跟随时回显 tokenPresets 落盘值；字面量字段仍走合并视图（不经 CSS 栈展开补全）。
 */
export function readInspectorDisplayFontFamily(
  block: EmailBlock,
  payload: EmailPayload,
  mergedBlock: EmailBlock | null | undefined,
  bindPath: string,
  template: EmailTemplate | null | undefined,
  tokenPresets: TokenPresets | null | undefined
): string {
  if (template && isThemeDetached(template, block.id, bindPath)) {
    const literal = readTemplateFieldOnly(block, bindPath);
    if (typeof literal === "string" && literal.trim()) {
      return normalizeThemeFontFamilyInput(literal) ?? coercePersistedFontFamily(literal);
    }
    return "";
  }
  const fromStorage = readThemeFontStorageDisplay(block, bindPath, tokenPresets);
  if (fromStorage) return fromStorage;
  const resolved = readInspectorDisplayValue(block, payload, mergedBlock, bindPath, template);
  if (typeof resolved === "string" && resolved.trim()) {
    return normalizeThemeFontFamilyInput(resolved) ?? coercePersistedFontFamily(resolved);
  }
  return "";
}
