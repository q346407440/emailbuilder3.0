import { DEFAULT_TOKEN_PRESET_ID } from "../lib/defaultTokenPresets";
import type { TokenPresets } from "../types/tokenPreset";
import type { RestoreTheme } from "./types";

export function themeToTokenPresets(
  theme: RestoreTheme,
  label = "AI 还原主题"
): TokenPresets {
  return {
    schemaVersion: "1.0.0",
    activePresetId: DEFAULT_TOKEN_PRESET_ID,
    presets: {
      [DEFAULT_TOKEN_PRESET_ID]: {
        label,
        description: "由 RestoreAst theme 组装器产出",
        tokens: structuredClone(theme),
      },
    },
    scopeSelections: {},
  };
}
