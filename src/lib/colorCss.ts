/** RGBA，供解析与输出共用（与取色器分量一致） */
export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** 无法解析时供取色器使用的占位色 */
export const RGBA_FALLBACK: RgbaColor = { r: 203, g: 213, b: 225, a: 1 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 输出标准 CSS rgba()（alpha 0～1，最多三位小数） */
export function rgbaToCss(c: RgbaColor): string {
  const r = clamp(Math.round(c.r), 0, 255);
  const g = clamp(Math.round(c.g), 0, 255);
  const b = clamp(Math.round(c.b), 0, 255);
  const a = clamp(Math.round(c.a * 1000) / 1000, 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * 解析 CSS 颜色为 RGBA（支持 #rgb / #rrggbb / #rrggbbaa、rgb()、rgba()、transparent）。
 */
export function parseCssColorToRgba(raw: string): RgbaColor | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  if (t.startsWith("#")) {
    const h = t.slice(1);
    if (/^[0-9a-f]{3}$/i.test(h)) {
      const [ra, ga, ba] = [...h].map((ch) => parseInt(ch + ch, 16));
      return { r: ra, g: ga, b: ba, a: 1 };
    }
    if (/^[0-9a-f]{6}$/i.test(h)) {
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }
    if (/^[0-9a-f]{8}$/i.test(h)) {
      const n = parseInt(h, 16);
      const r = (n >> 24) & 255;
      const g = (n >> 16) & 255;
      const b = (n >> 8) & 255;
      const alphaByte = n & 255;
      return { r, g, b, a: alphaByte / 255 };
    }
    return null;
  }

  const m = t.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i
  );
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  if ([r, g, b, a].some((x) => Number.isNaN(x))) return null;
  return {
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
    a: clamp(a, 0, 1),
  };
}

export function rgbaForPicker(raw: string): RgbaColor {
  return parseCssColorToRgba(raw) ?? RGBA_FALLBACK;
}
