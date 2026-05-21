/**
 * 判断 CSS 长度字符串是否适合用「数值 + 固定单位」的步进输入（如 ShopUnitInput）。
 * 含 %、auto、em 等时应用自由文本输入，避免单位输入框误约束。
 */
export function cssSizeStringPrefersUnitNumericInput(raw: unknown): boolean {
  const t = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!t || t === "auto") return false;
  if (/%|em|rem|vh|vw|ch|ex|calc\(|var\(/.test(t)) return false;
  // 纯数字或 12 / 12.5 / 12px / -12px
  return /^-?\d*\.?\d+px?$/.test(t);
}
