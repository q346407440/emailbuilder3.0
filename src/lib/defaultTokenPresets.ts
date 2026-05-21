import type { TokenPresets, TokenScaleMap } from "../types/tokenPreset";
import { BASELINE_EXPANDED_THEME } from "./baselineExpandedTheme";

export const DEFAULT_TOKEN_PRESET_ID = "default";

function pickScales(src: Record<string, string>, keys: readonly string[]): TokenScaleMap {
  const out: TokenScaleMap = {};
  for (const k of keys) {
    const v = src[k];
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
}

/** 与 data/emails 下各邮件 tokenPresets.json 中实际维护的键并集对齐；全量默认值来自 `BASELINE_EXPANDED_THEME`。 */
const DEFAULT_COLOR_KEYS = ["brand", "accent", "surface", "surfaceMuted", "text", "textMuted", "border"] as const;
const DEFAULT_SPACING_BASE_KEYS = ["xs", "sm", "md", "lg", "xl", "section"] as const;
const DEFAULT_TYPO_KEYS = ["display", "h1", "h2", "body", "caption", "micro"] as const;
const DEFAULT_FONT_KEYS = ["heading", "body"] as const;

export function createDefaultTokenPresets(): TokenPresets {
  const baseline = BASELINE_EXPANDED_THEME;
  const colors: TokenScaleMap = {
    ...pickScales(baseline.colors, DEFAULT_COLOR_KEYS),
    primary: "#000000",
    secondary: "#666666",
  };
  const spacing: TokenScaleMap = {
    ...pickScales(baseline.tokens.spacing, DEFAULT_SPACING_BASE_KEYS),
    gap: "16px",
    pageInline: "24px",
  };
  const typography = pickScales(baseline.tokens.typography, DEFAULT_TYPO_KEYS);
  const fonts = pickScales(baseline.fonts, DEFAULT_FONT_KEYS);

  return {
    schemaVersion: "1.0.0",
    activePresetId: DEFAULT_TOKEN_PRESET_ID,
    presets: {
      [DEFAULT_TOKEN_PRESET_ID]: {
        label: "默认预设",
        description:
          "与本仓库邮件 tokenPresets 可编辑键对齐的精简档位；未列出的令牌在预览中由仓库基线主题（`BASELINE_EXPANDED_THEME`）补齐。",
        tokens: {
          colors,
          fonts,
          spacing,
          typography,
        },
      },
    },
    scopeSelections: {},
  };
}
