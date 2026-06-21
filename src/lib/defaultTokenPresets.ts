import type { TokenPresets } from "../types/tokenPreset";
import { AI_PIPELINE_B1_FALLBACK_TOKENS } from "./ai-pipeline/b1StyleTierPresets";

export const DEFAULT_TOKEN_PRESET_ID = "default";

/** 内存/落盘缺省：仅含契约标准 13 键；预览其余色阶由 `BASELINE_EXPANDED_THEME` 补齐。 */
export function createDefaultTokenPresets(): TokenPresets {
  return {
    schemaVersion: "1.0.0",
    activePresetId: DEFAULT_TOKEN_PRESET_ID,
    presets: {
      [DEFAULT_TOKEN_PRESET_ID]: {
        label: "默认预设",
        description:
          "与本仓库邮件 tokenPresets 标准 13 键对齐；未列出的令牌在预览中由仓库基线主题（`BASELINE_EXPANDED_THEME`）补齐。",
        tokens: structuredClone(AI_PIPELINE_B1_FALLBACK_TOKENS),
      },
    },
    scopeSelections: {},
  };
}
