import { cssSizeStringPrefersUnitNumericInput } from "./cssSizeString";

const DIMENSIONAL_TOKEN_FAMILIES = new Set(["spacing", "radius", "typography"]);

/**
 * 裸数字（可含小数、负号）视为与 `NNpx` 等价，供 ShopUnitInput 补全单位。
 */
function looksLikeBareCssNumberForPx(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  return /^-?\d*\.?\d+$/.test(t);
}

/**
 * 样式预设里某条 token 是否适合用 ShopUnitInput（数值 + px 后缀）。
 * 颜色走 ColorField；fonts 走画布同款单选下拉；其余含 %/rem/calc 等的长度保持文本输入（ShopInput）。
 */
export function tokenPresetFieldUsesShopUnitInput(family: string, rawValue: string): boolean {
  if (!DIMENSIONAL_TOKEN_FAMILIES.has(family)) return false;
  const t = typeof rawValue === "string" ? rawValue.trim() : "";
  if (t === "") return true;
  return cssSizeStringPrefersUnitNumericInput(t) || looksLikeBareCssNumberForPx(t);
}
