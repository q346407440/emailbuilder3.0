/** 解析 #RGB / #RRGGBB 为 sRGB 分量。 */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(t);
  if (short) {
    const s = short[1];
    const n = parseInt(
      s
        .split("")
        .map((c) => c + c)
        .join(""),
      16
    );
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const full = /^#([0-9a-f]{6})$/i.exec(t);
  if (!full) return null;
  const n = parseInt(full[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** 相对亮度 0–1（sRGB / WCAG）。 */
export function relativeLuminanceFromHex(hex: string): number | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/** WCAG 对比度（≥ 4.5 为正文可读下限）。 */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const la = relativeLuminanceFromHex(hexA);
  const lb = relativeLuminanceFromHex(hexB);
  if (la == null || lb == null) return null;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 浅底 → 深字，深底 → 白字。 */
export function pickContrastingTextColor(bgHex: string): string {
  const lum = relativeLuminanceFromHex(bgHex);
  if (lum == null) return "#1A1A1A";
  return lum > 0.5 ? "#1A1A1A" : "#FFFFFF";
}

export function hasInsufficientContrast(
  bgHex: string,
  textHex: string,
  minRatio = 4.5
): boolean {
  const ratio = contrastRatio(bgHex, textHex);
  if (ratio == null) return false;
  return ratio < minRatio;
}
