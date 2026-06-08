import type { NormalizedStyleTokens } from "./types";

/** 正文/标题缺省字色（非 CTA 背景色 primary）。 */
export const AI_PIPELINE_DEFAULT_BODY_TEXT_COLOR = "#1A1A1A";

/** 高明度 primary 上 CTA 字色缺省。 */
export const AI_PIPELINE_DEFAULT_CTA_TEXT_ON_LIGHT_PRIMARY = "#1A1A1A";

/** 低明度 primary 上 CTA 字色缺省。 */
export const AI_PIPELINE_DEFAULT_CTA_TEXT_ON_DARK_PRIMARY = "#FFFFFF";

export type LoweringSemanticStats = {
  /** content.text 使用正文缺省色（非 Agent 显式 color） */
  textColorBodyDefault: number;
  /** action.button 使用「浅底黑字 / 深底白字」缺省 */
  buttonTextColorSemanticDefault: number;
};

export function createLoweringSemanticStats(): LoweringSemanticStats {
  return { textColorBodyDefault: 0, buttonTextColorSemanticDefault: 0 };
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** 相对亮度 0–1（sRGB）。 */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/** primary 视为「浅底」时用黑字 CTA（邮件黄底按钮等）。 */
export function isLightPrimaryColor(primaryHex: string): boolean {
  const lum = relativeLuminance(primaryHex);
  if (lum == null) return true;
  return lum > 0.55;
}

export function defaultBodyTextColor(_tokens: NormalizedStyleTokens): string {
  return AI_PIPELINE_DEFAULT_BODY_TEXT_COLOR;
}

export function defaultCtaTextOnPrimary(primaryHex: string): string {
  return isLightPrimaryColor(primaryHex)
    ? AI_PIPELINE_DEFAULT_CTA_TEXT_ON_LIGHT_PRIMARY
    : AI_PIPELINE_DEFAULT_CTA_TEXT_ON_DARK_PRIMARY;
}

/** text 块 color 是否允许升格为 colors.primary（themeRef）。 */
export function textColorMayBindPrimaryToken(literal: string, primaryHex: string): boolean {
  return literal.trim().toLowerCase() === primaryHex.trim().toLowerCase();
}
