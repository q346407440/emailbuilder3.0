import {
  TOKEN_PRESET_FAMILY_ORDER,
  TOKEN_PRESET_SCALE_ORDER,
} from "../../token-preset-contract/standard-keys";

/** §7.1.1 spacing 枚举（偶数 px）。 */
export const B1_SPACING_TIER_ENUMS = {
  section: ["12px", "16px", "20px", "24px"] as const,
  gap: ["8px", "12px", "16px", "20px"] as const,
  pageInline: ["16px", "20px", "24px"] as const,
};

/** §7.1.1 typography 枚举。 */
export const B1_TYPOGRAPHY_TIER_ENUMS = {
  display: ["28px", "32px", "36px"] as const,
  h1: ["22px", "24px", "26px"] as const,
  body: ["14px", "16px"] as const,
  caption: ["12px", "14px"] as const,
};

/** §7.1.1 radius 枚举。 */
export const B1_RADIUS_TIER_ENUMS = {
  panel: ["0", "8px", "12px", "16px"] as const,
  cta: ["0", "8px", "24px", "9999px"] as const,
};

/** 供 Zod enum / json_schema / prompt 注入的统一枚举表。 */
export const B1_TIER_ENUMS = {
  spacing: B1_SPACING_TIER_ENUMS,
  typography: B1_TYPOGRAPHY_TIER_ENUMS,
  radius: B1_RADIUS_TIER_ENUMS,
} as const;

/** §7.1.1 管线兜底整表（偶数档）。 */
export const AI_PIPELINE_B1_FALLBACK_TOKENS = {
    colors: {
    primary: "#111827",
    accent: "#1A1A1A",
    secondary: "#6B7280",
    surface: "#FFFFFF",
  },
  spacing: {
    section: "16px",
    gap: "12px",
    pageInline: "20px",
  },
  typography: {
    display: "32px",
    h1: "24px",
    body: "16px",
    caption: "12px",
  },
  radius: {
    panel: "12px",
    cta: "8px",
  },
} as const;

/** 将 B1_TIER_ENUMS 格式化为 prompt 附录文本。 */
export function formatB1TierEnumsForPrompt(): string {
  const lines: string[] = [];
  for (const family of TOKEN_PRESET_FAMILY_ORDER) {
    if (family === "colors") continue;
    const scales = TOKEN_PRESET_SCALE_ORDER[family] ?? [];
    for (const scale of scales) {
      const enums =
        family === "spacing"
          ? B1_SPACING_TIER_ENUMS[scale as keyof typeof B1_SPACING_TIER_ENUMS]
          : family === "typography"
            ? B1_TYPOGRAPHY_TIER_ENUMS[scale as keyof typeof B1_TYPOGRAPHY_TIER_ENUMS]
            : B1_RADIUS_TIER_ENUMS[scale as keyof typeof B1_RADIUS_TIER_ENUMS];
      lines.push(`${family}.${scale}: ${enums.join(" | ")}`);
    }
  }
  return lines.join("\n");
}

export function parsePxValue(raw: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*px?$/i.exec(raw.trim());
  if (!m) return 0;
  return Number(m[1]) || 0;
}
