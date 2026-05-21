import type { ExpandedTheme } from "../types/theme";
import type { TokenPresets } from "../types/tokenPreset";
import { readTokenPresetStorageValue } from "./resolveTokenPreset";

/** 仓库标准 14 键（与 email-token-preset-standard-scope 对齐） */
export const STANDARD_THEME_TOKEN_PATHS = [
  "colors.primary",
  "colors.secondary",
  "colors.surface",
  "fonts.heading",
  "fonts.body",
  "tokens.spacing.section",
  "tokens.spacing.gap",
  "tokens.spacing.pageInline",
  "tokens.typography.display",
  "tokens.typography.h1",
  "tokens.typography.body",
  "tokens.typography.caption",
  "tokens.radius.panel",
  "tokens.radius.cta",
] as const;

/** surface / primary / secondary：容器背景与文字、图标描边等前景色共用（主背景 surface 在前） */
const COLOR_SURFACE_PRIMARY_SECONDARY = ["colors.surface", "colors.primary", "colors.secondary"] as const;
const FONTS = ["fonts.heading", "fonts.body"] as const;
const TYPOGRAPHY = [
  "tokens.typography.display",
  "tokens.typography.h1",
  "tokens.typography.body",
  "tokens.typography.caption",
] as const;
const SPACING = [
  "tokens.spacing.section",
  "tokens.spacing.gap",
  "tokens.spacing.pageInline",
] as const;
const RADIUS = ["tokens.radius.panel", "tokens.radius.cta"] as const;

function pathLeaf(bindPath: string): string {
  return bindPath.split(".").pop() ?? "";
}

function pathParent(bindPath: string): string {
  const parts = bindPath.split(".");
  return parts.length >= 2 ? parts[parts.length - 2]! : "";
}

/**
 * 按字段 JSON 路径推断可绑定的标准令牌列表（供 Inspector 胶囊菜单展示）。
 */
export function suggestThemeTokenPaths(_blockType: string, bindPath: string): string[] {
  const leaf = pathLeaf(bindPath);
  const parent = pathParent(bindPath);

  if (leaf === "fontSize") return [...TYPOGRAPHY];
  if (leaf === "fontFamily") return [...FONTS];
  if (leaf === "color" || leaf === "textColor") return [...COLOR_SURFACE_PRIMARY_SECONDARY];
  if (leaf === "backgroundColor") {
    return [...COLOR_SURFACE_PRIMARY_SECONDARY];
  }
  if (leaf === "gap" || parent === "padding" || parent === "margin") return [...SPACING];
  if (
    leaf === "radius" ||
    parent === "borderRadius" ||
    bindPath.includes("borderRadius")
  ) {
    return [...RADIUS];
  }
  if (leaf === "height" || leaf === "width") return [...SPACING, ...TYPOGRAPHY];

  return [...STANDARD_THEME_TOKEN_PATHS];
}

export function parseTokenPathForLabel(tokenPath: string): { family: string; scale: string } {
  if (tokenPath.startsWith("tokens.")) {
    const parts = tokenPath.split(".");
    return { family: parts[1] ?? "tokens", scale: parts[2] ?? tokenPath };
  }
  const [family, scale] = tokenPath.split(".");
  return { family: family ?? "token", scale: scale ?? tokenPath };
}

export function previewThemeTokenValue(theme: ExpandedTheme | null | undefined, tokenPath: string): string | null {
  if (!theme) return null;
  const segments = tokenPath.split(".");
  let cursor: unknown = theme;
  for (const segment of segments) {
    if (!segment || typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" && cursor.trim() ? cursor : null;
}

/** 样式预设胶囊菜单：回显 tokenPresets 落盘值（字体等不经 CSS 栈展开）。 */
export function previewThemeTokenStorageValue(
  tokenPresets: TokenPresets | null | undefined,
  tokenPath: string
): string | null {
  const stored = readTokenPresetStorageValue(tokenPresets, tokenPath);
  return stored ?? null;
}

/** 字段绑定路径是否为主题字体档位（落盘回显走 storage，不走 ExpandedTheme 展开）。 */
export function isThemeFontTokenBindPath(bindPath: string): boolean {
  return bindPath === "props.fontFamily" || bindPath === "props.buttonStyle.fontFamily";
}

export function previewThemeTokenValueForField(
  bindPath: string,
  tokenPath: string,
  theme: ExpandedTheme | null | undefined,
  tokenPresets: TokenPresets | null | undefined
): string | null {
  if (isThemeFontTokenBindPath(bindPath) || tokenPath.startsWith("fonts.")) {
    return previewThemeTokenStorageValue(tokenPresets, tokenPath);
  }
  return previewThemeTokenValue(theme, tokenPath);
}
