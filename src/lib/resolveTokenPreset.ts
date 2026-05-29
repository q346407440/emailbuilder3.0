import type { ExpandedTheme } from "../types/theme";
import type { TokenPresets, TokenScaleSelection } from "../types/tokenPreset";
import { BASELINE_EXPANDED_THEME } from "./baselineExpandedTheme";
import { createDefaultTokenPresets } from "./defaultTokenPresets";

function pickPreset(tokenPresets: TokenPresets | null | undefined) {
  if (!tokenPresets) return null;
  return tokenPresets.presets[tokenPresets.activePresetId] ?? Object.values(tokenPresets.presets)[0] ?? null;
}

/**
 * 读取 tokenPresets.json 落盘字符串。
 * 路径与 template `$themeRef` / bindings.tokenPath 一致（如 `colors.primary`、`tokens.typography.body`）。
 */
export function readTokenPresetStorageValue(
  tokenPresets: TokenPresets | null | undefined,
  tokenPath: string
): string | undefined {
  const preset = pickPreset(tokenPresets);
  if (!preset?.tokens) return undefined;
  const parts = tokenPath.split(".").filter(Boolean);
  if (parts.length < 2) return undefined;
  const pathParts = parts[0] === "tokens" ? parts.slice(1) : parts;
  if (pathParts.length < 2) return undefined;
  let cursor: unknown = preset.tokens;
  for (const part of pathParts) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return typeof cursor === "string" && cursor.trim() ? cursor : undefined;
}

function readFamilyValue(
  tokenPresets: TokenPresets | null | undefined,
  family: string,
  scale: string | undefined
): string | undefined {
  if (!scale) return undefined;
  const preset = pickPreset(tokenPresets);
  const value = preset?.tokens?.[family]?.[scale];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function resolveTokenScaleSelection(
  tokenPresets: TokenPresets | null | undefined,
  family: string,
  selection: TokenScaleSelection | undefined,
  fallbackScale = "md"
): string | undefined {
  if (!selection || selection.mode === "follow") return readFamilyValue(tokenPresets, family, fallbackScale);
  if (selection.mode === "custom") return selection.value;
  return readFamilyValue(tokenPresets, family, selection.scale);
}

function withFallback<T extends Record<string, string>>(
  fallback: T,
  values: Record<string, string> | undefined
): T {
  return { ...fallback, ...(values ?? {}) };
}

/**
 * 将显式 tokenPresets 展开为预览可消费的 ExpandedTheme；缺失字段由仓库基线 `BASELINE_EXPANDED_THEME` 兜底。
 */
export function resolveDesignTokens(tokenPresets: TokenPresets | null | undefined): ExpandedTheme {
  const fallback = BASELINE_EXPANDED_THEME;
  const source = pickPreset(tokenPresets) ?? pickPreset(createDefaultTokenPresets());
  const tokens = source?.tokens ?? {};
  return {
    schemaVersion: "2.0.0",
    colors: withFallback(fallback.colors, tokens.colors),
    tokens: {
      spacing: withFallback(fallback.tokens.spacing, tokens.spacing),
      typography: withFallback(fallback.tokens.typography, tokens.typography),
      radius: withFallback(fallback.tokens.radius, tokens.radius),
    },
  };
}
