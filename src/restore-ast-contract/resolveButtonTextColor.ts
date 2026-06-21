import {
  contrastRatio,
  hasInsufficientContrast,
  pickContrastingTextColor,
  relativeLuminanceFromHex,
} from "../lib/pickContrastingTextColor";
import { isThemeRef, parseThemeRefPath, type ThemeRef } from "../types/themeRef";
import type { ThemeBoundScalar } from "./buildPrimitives";
import { DEFAULT_TEXT_COLOR } from "./buildPrimitives";
import { resolveTone } from "./resolveValue";
import type { RestoreTheme, ToneToken } from "./types";
import { isToneToken } from "./tokens";

/** 背景 token → 优先绑定的对比字色 token（保留主题切换）。 */
const CONTRAST_TEXT_TOKEN_FOR_BG: Record<ToneToken, ToneToken> = {
  surface: "primary",
  primary: "surface",
  accent: "primary",
  secondary: "surface",
};

function resolveBoundColorToHex(value: string | ThemeRef, theme: RestoreTheme): string | null {
  if (typeof value === "string") {
    return value.trim().startsWith("#") ? value.trim() : null;
  }
  if (!isThemeRef(value)) return null;
  const path = parseThemeRefPath(value);
  if (!path.startsWith("colors.")) return null;
  const scale = path.slice("colors.".length);
  if (!isToneToken(scale)) return null;
  return theme.colors[scale] ?? null;
}

function isSameColorBinding(a: string | ThemeRef, b: string | ThemeRef): boolean {
  if (isThemeRef(a) && isThemeRef(b)) {
    return parseThemeRefPath(a) === parseThemeRefPath(b);
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return false;
}

function buttonTextNeedsContrastFix(
  bg: ThemeBoundScalar,
  preferredText: ThemeBoundScalar,
  theme: RestoreTheme
): boolean {
  if (isSameColorBinding(bg.value, preferredText.value)) {
    return true;
  }
  const bgHex = resolveBoundColorToHex(bg.value, theme);
  const textHex = resolveBoundColorToHex(preferredText.value, theme);
  if (bgHex && textHex) {
    return hasInsufficientContrast(bgHex, textHex);
  }
  return false;
}

function contrastTextViaThemeToken(
  fieldPath: string,
  bg: ThemeBoundScalar
): ThemeBoundScalar | null {
  if (!isThemeRef(bg.value)) return null;
  const path = parseThemeRefPath(bg.value);
  if (!path.startsWith("colors.")) return null;
  const bgToken = path.slice("colors.".length);
  if (!isToneToken(bgToken)) return null;
  const textToken = CONTRAST_TEXT_TOKEN_FOR_BG[bgToken];
  return resolveTone(fieldPath, textToken);
}

function contrastTextViaLuminance(
  fieldPath: string,
  bg: ThemeBoundScalar,
  theme: RestoreTheme
): ThemeBoundScalar {
  const bgHex = resolveBoundColorToHex(bg.value, theme);
  if (!bgHex) {
    return { value: DEFAULT_TEXT_COLOR };
  }
  const literal = pickContrastingTextColor(bgHex);
  void fieldPath;
  return { value: literal };
}

/**
 * 按钮字色：默认 CTA 反白；若与背景同色或对比度不足，则兜底对比色。
 * 优先绑 theme 对比 token；hex 背景时用亮度算 #1A1A1A / #FFFFFF。
 */
export function resolveButtonTextColor(
  fieldPath: string,
  bg: ThemeBoundScalar,
  preferredText: ThemeBoundScalar,
  theme: RestoreTheme
): ThemeBoundScalar {
  if (!buttonTextNeedsContrastFix(bg, preferredText, theme)) {
    return preferredText;
  }

  const viaToken = contrastTextViaThemeToken(fieldPath, bg);
  if (viaToken) {
    const bgHex = resolveBoundColorToHex(bg.value, theme);
    const textHex = resolveBoundColorToHex(viaToken.value, theme);
    if (bgHex && textHex && !hasInsufficientContrast(bgHex, textHex)) {
      return viaToken;
    }
  }

  return contrastTextViaLuminance(fieldPath, bg, theme);
}

/** 供单测：两色绑定在 theme 下是否足够对比。 */
export function buttonTextContrastRatioForTheme(
  bg: ThemeBoundScalar,
  text: ThemeBoundScalar,
  theme: RestoreTheme
): number | null {
  const bgHex = resolveBoundColorToHex(bg.value, theme);
  const textHex = resolveBoundColorToHex(text.value, theme);
  if (!bgHex || !textHex) return null;
  return contrastRatio(bgHex, textHex);
}

/** 供单测：hex 是否在亮度意义上偏浅。 */
export function isLightBackgroundHex(hex: string): boolean {
  const lum = relativeLuminanceFromHex(hex);
  return lum != null && lum > 0.5;
}
