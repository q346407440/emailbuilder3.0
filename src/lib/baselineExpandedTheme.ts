import type { EmailTheme, ExpandedTheme, ThemeDensity, ThemeTypographyRails } from "../types/theme";

/**
 * 画布预览用的「中性基线」展开主题：数值与历史 `expandTheme(null)` 一致。
 * 生产路径中，`resolveDesignTokens` 以本对象为底，再合并各邮件 `tokenPresets`；
 * 本模块不读磁盘 `theme.json`，邮件视觉真源为 `tokenPresets.json`。
 *
 * `mergeEmailThemeIntoBaseline` 仅保留给单测或少量工具在内存中模拟覆盖（品牌色、字号轨道等）。
 * 应用运行时预览不应依赖传入非空的 `EmailTheme`。
 */

const DEFAULT_BRAND = "#3f60c8";
const DEFAULT_ACCENT = "#ff832a";
const DEFAULT_DENSITY: ThemeDensity = "comfortable";

const NEUTRAL_LIGHT = {
  surface: "#ffffff",
  surfaceMuted: "#efefef",
  surfaceInverse: "#2d2d2d",
  text: "#333333",
  textMuted: "#8a8a8a",
  textInverse: "#ffffff",
  border: "#d6d6d6",
  danger: "#e53935",
} as const;

const DEFAULT_TYPO_HERO_PX = 50;
const DEFAULT_TYPO_TITLE_PX = 32;
const DEFAULT_TYPO_BODY_PX = 16;

const R_H2_FROM_H1 = 22 / 32;
const R_CAPTION_FROM_BODY = 13 / 16;
const R_MICRO_FROM_BODY = 11 / 16;

function parsePxInput(raw: string | undefined, fallback: number): number {
  if (raw === undefined || !String(raw).trim()) return fallback;
  const s = String(raw).trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*px$/i) ?? s.match(/^(\d+(?:\.\d+)?)$/);
  if (!m) return fallback;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 200) return fallback;
  return Math.round(n);
}

function buildTypographyTokens(rails: ThemeTypographyRails | undefined): ExpandedTheme["tokens"]["typography"] {
  const heroPx = parsePxInput(rails?.hero, DEFAULT_TYPO_HERO_PX);
  const h1Px = parsePxInput(rails?.title, DEFAULT_TYPO_TITLE_PX);
  const bodyPx = parsePxInput(rails?.body, DEFAULT_TYPO_BODY_PX);
  const h2Px = Math.max(1, Math.round(h1Px * R_H2_FROM_H1));
  const captionPx = Math.max(1, Math.round(bodyPx * R_CAPTION_FROM_BODY));
  const microPx = Math.max(1, Math.round(bodyPx * R_MICRO_FROM_BODY));
  return {
    display: `${heroPx}px`,
    h1: `${h1Px}px`,
    h2: `${h2Px}px`,
    body: `${bodyPx}px`,
    caption: `${captionPx}px`,
    micro: `${microPx}px`,
  };
}

const SPACING_BY_DENSITY: Record<ThemeDensity, ExpandedTheme["tokens"]["spacing"]> = {
  comfortable: { xs: "6px", sm: "10px", md: "14px", lg: "20px", xl: "24px", section: "24px" },
  compact: { xs: "4px", sm: "6px", md: "10px", lg: "14px", xl: "20px", section: "16px" },
};

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
}

function pickContrastText(bgHex: string): string {
  const rgb = parseHex(bgHex);
  if (!rgb) return "#ffffff";
  return relativeLuminance(rgb) > 0.5 ? "#1a1a1a" : "#ffffff";
}

/**
 * 在固定中性基线上应用可选 `EmailTheme` 覆盖（品牌色、密度、字号轨道）。
 */
export function mergeEmailThemeIntoBaseline(theme: EmailTheme | null | undefined): ExpandedTheme {
  const brand = theme?.brand ?? DEFAULT_BRAND;
  const accent = theme?.accent ?? DEFAULT_ACCENT;
  const density: ThemeDensity = theme?.density ?? DEFAULT_DENSITY;

  return {
    schemaVersion: "2.0.0",
    colors: {
      brand,
      accent,
      onBrand: pickContrastText(brand),
      onAccent: pickContrastText(accent),
      ...NEUTRAL_LIGHT,
    },
    tokens: {
      spacing: SPACING_BY_DENSITY[density],
      typography: buildTypographyTokens(theme?.typography),
      radius: {},
    },
  };
}

/** 与 `mergeEmailThemeIntoBaseline(null)` 等价，供 `resolveDesignTokens` / 默认预设构造复用。 */
export const BASELINE_EXPANDED_THEME: ExpandedTheme = mergeEmailThemeIntoBaseline(null);
