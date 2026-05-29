import type { EmailMeta } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import type { TokenPresets } from "../types/tokenPreset";
import { resolveDesignTokens } from "./resolveTokenPreset";

/** 接入页样式来源：本邮件版式目录 tokenPresets，或公共预设 id */
export type IntegrationTokenPresetSelection = "local" | string;

export function resolveInitialIntegrationTokenPreset(
  meta: EmailMeta | null,
  emailTokenPresets: TokenPresets | null,
  globalPresetIds: Set<string>,
  urlTokenPreset: string | null
): IntegrationTokenPresetSelection {
  const raw = (urlTokenPreset ?? "").trim();
  if (raw === "local") return "local";
  if (raw && globalPresetIds.has(raw)) return raw;
  const fromMeta = meta?.defaultStylePresetSelection;
  if (fromMeta === "local") return "local";
  if (fromMeta && globalPresetIds.has(fromMeta)) return fromMeta;
  const legacy = emailTokenPresets?.appliedGlobalPresetId;
  if (legacy && globalPresetIds.has(legacy)) return legacy;
  return "local";
}

/** 与编辑器画布一致：选公共预设时用该公共文档展开 $themeRef，否则用本邮件版式 tokenPresets */
export function resolveIntegrationExpandedTheme(
  localTokenPresets: TokenPresets | null,
  globalTokenPresets: Record<string, TokenPresets>,
  selection: IntegrationTokenPresetSelection
): ExpandedTheme {
  if (!localTokenPresets) return resolveDesignTokens(null);
  if (selection === "local") return resolveDesignTokens(localTokenPresets);
  const picked = globalTokenPresets[selection];
  if (picked) return resolveDesignTokens(picked);
  return resolveDesignTokens(localTokenPresets);
}

export function integrationTokenPresetLabel(
  selection: IntegrationTokenPresetSelection,
  globalTokenPresets: Record<string, TokenPresets>
): string {
  if (selection === "local") return "本邮件版式 tokenPresets.json";
  const doc = globalTokenPresets[selection];
  const name = doc?.presets?.[doc.activePresetId]?.name;
  return name ? `公共预设：${name}（${selection}）` : `公共预设：${selection}`;
}
