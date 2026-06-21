import type { TokenPresets, TokenPresetTokens } from "../types/tokenPreset";
import { DEFAULT_TOKEN_PRESET_ID } from "./defaultTokenPresets";

/** 新建公共样式预设时写入的固定 token 档位（与常见邮件 tokenPresets 可编辑键对齐）。 */
export const NEW_PUBLIC_TOKEN_PRESET_DEFAULT_TOKENS: TokenPresetTokens = {
  colors: {
    primary: "#111111",
    accent: "#FFFFFF",
    secondary: "#666666",
    surface: "#FFFFFF",
  },
  spacing: {
    section: "16px",
    gap: "8px",
    pageInline: "16px",
  },
  typography: {
    display: "24px",
    h1: "20px",
    body: "14px",
    caption: "12px",
  },
  radius: {
    panel: "0",
    cta: "0",
  },
};

/** 由展示名称生成唯一公共预设文件 id（`data/token-presets/<id>.json`）。 */
export function derivePublicTokenPresetId(
  displayName: string,
  existingIds: Iterable<string>
): string {
  const taken = new Set(existingIds);
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  let base = slug ? (slug.startsWith("public-") ? slug : `public-${slug}`) : "";
  if (!base || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(base)) {
    base = `public-preset-${Date.now().toString(36)}`;
  }

  if (!taken.has(base)) return base;
  for (let i = 2; i < 10_000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** 组装新建公共预设的完整 JSON 文档（固定 tokens + 用户填写的展示名）。 */
export function buildNewPublicTokenPresetsDocument(displayLabel: string): TokenPresets {
  const label = displayLabel.trim() || "新公共预设";
  return {
    schemaVersion: "1.0.0",
    activePresetId: DEFAULT_TOKEN_PRESET_ID,
    presets: {
      [DEFAULT_TOKEN_PRESET_ID]: {
        label,
        description: "新建的公共样式预设",
        tokens: structuredClone(NEW_PUBLIC_TOKEN_PRESET_DEFAULT_TOKENS),
      },
    },
    scopeSelections: {},
  };
}
