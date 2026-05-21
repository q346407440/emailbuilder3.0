import { checkTokenPresetFontStorageValue } from "../font-family-contract";
import {
  EMAIL_CONTAINER_SPACING_MAX_PX,
  parseSpacingPx,
  spacingPxExceedsMax,
} from "../lib/spacingPxCap";
import type { TokenPresets } from "../types/tokenPreset";
import {
  TOKEN_PRESET_FAMILY_ORDER,
  TOKEN_PRESET_SCALE_ORDER,
  isStandardTokenScale,
} from "./standard-keys";

export type TokenPresetContractIssue = { path: string; reason: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 校验单个 `presets.*.tokens` 对象：仅允许标准 family/scale，且 14 键齐全 */
export function validateTokenPresetTokens(
  tokensPath: string,
  tokens: Record<string, unknown>
): TokenPresetContractIssue[] {
  const issues: TokenPresetContractIssue[] = [];
  const allowedFamilies = new Set<string>(TOKEN_PRESET_FAMILY_ORDER);

  for (const family of Object.keys(tokens)) {
    if (!allowedFamilies.has(family)) {
      issues.push({
        path: `${tokensPath}.${family}`,
        reason: `非标准 token family「${family}」，仅允许 ${TOKEN_PRESET_FAMILY_ORDER.join(" / ")}`,
      });
    }
  }

  for (const family of TOKEN_PRESET_FAMILY_ORDER) {
    const scalesRaw = tokens[family];
    const scalesPath = `${tokensPath}.${family}`;
    if (!isPlainObject(scalesRaw)) {
      issues.push({ path: scalesPath, reason: `缺少标准 token family「${family}」` });
      continue;
    }
    for (const scale of Object.keys(scalesRaw)) {
      if (!isStandardTokenScale(family, scale)) {
        issues.push({
          path: `${scalesPath}.${scale}`,
          reason: `非标准 scale「${scale}」，${family} 仅允许 ${(TOKEN_PRESET_SCALE_ORDER[family] ?? []).join(" / ")}`,
        });
      }
    }
    for (const scale of TOKEN_PRESET_SCALE_ORDER[family] ?? []) {
      if (!(scale in scalesRaw)) {
        issues.push({ path: `${scalesPath}.${scale}`, reason: `缺少标准 scale「${scale}」` });
      }
    }
    if (family === "fonts") {
      for (const scale of TOKEN_PRESET_SCALE_ORDER.fonts ?? []) {
        const raw = scalesRaw[scale];
        if (typeof raw !== "string") continue;
        const fontCheck = checkTokenPresetFontStorageValue(raw);
        if (!fontCheck.ok) {
          issues.push({ path: `${scalesPath}.${scale}`, reason: fontCheck.reason });
        }
      }
    }
    if (family === "spacing") {
      for (const scale of TOKEN_PRESET_SCALE_ORDER.spacing ?? []) {
        const raw = scalesRaw[scale];
        if (typeof raw !== "string") continue;
        const n = parseSpacingPx(raw);
        if (n == null) {
          issues.push({
            path: `${scalesPath}.${scale}`,
            reason: `spacing 档位须为 px 数值（如 16px）`,
          });
        } else if (spacingPxExceedsMax(raw)) {
          issues.push({
            path: `${scalesPath}.${scale}`,
            reason: `容器间距不得超过 ${EMAIL_CONTAINER_SPACING_MAX_PX}px（当前 ${raw}）`,
          });
        }
      }
    }
  }

  return issues;
}

/** 校验完整 `tokenPresets.json`（本邮件或公共预设同形） */
export function validateTokenPresets(
  tokenPresets: TokenPresets | null | undefined
): TokenPresetContractIssue[] {
  const issues: TokenPresetContractIssue[] = [];
  if (!tokenPresets) return issues;
  if (!isPlainObject(tokenPresets)) {
    return [{ path: "tokenPresets", reason: "样式预设必须为对象" }];
  }
  if (tokenPresets.schemaVersion !== "1.0.0") {
    issues.push({ path: "tokenPresets.schemaVersion", reason: "样式预设版本必须为 1.0.0" });
  }
  if (!tokenPresets.activePresetId || typeof tokenPresets.activePresetId !== "string") {
    issues.push({ path: "tokenPresets.activePresetId", reason: "activePresetId 必须为非空字符串" });
  }
  if (!isPlainObject(tokenPresets.presets) || Object.keys(tokenPresets.presets).length === 0) {
    issues.push({ path: "tokenPresets.presets", reason: "presets 必须至少包含一套预设" });
    return issues;
  }
  if (!tokenPresets.presets[tokenPresets.activePresetId]) {
    issues.push({ path: "tokenPresets.activePresetId", reason: "activePresetId 指向的预设不存在" });
  }
  if (tokenPresets.appliedGlobalPresetId !== undefined && tokenPresets.appliedGlobalPresetId !== null) {
    const id = tokenPresets.appliedGlobalPresetId;
    if (typeof id !== "string" || !id.trim()) {
      issues.push({
        path: "tokenPresets.appliedGlobalPresetId",
        reason: "appliedGlobalPresetId 若存在须为非空字符串",
      });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      issues.push({
        path: "tokenPresets.appliedGlobalPresetId",
        reason: "appliedGlobalPresetId 仅允许英文字母、数字、下划线与中划线",
      });
    }
  }

  for (const [presetId, preset] of Object.entries(tokenPresets.presets)) {
    const presetPath = `tokenPresets.presets.${presetId}`;
    if (!preset.label || typeof preset.label !== "string") {
      issues.push({ path: `${presetPath}.label`, reason: "预设 label 必须为非空字符串" });
    }
    if (!isPlainObject(preset.tokens)) {
      issues.push({ path: `${presetPath}.tokens`, reason: "tokens 必须为对象" });
      continue;
    }
    issues.push(...validateTokenPresetTokens(`${presetPath}.tokens`, preset.tokens));
    for (const [family, scales] of Object.entries(preset.tokens)) {
      if (!isPlainObject(scales)) {
        issues.push({ path: `${presetPath}.tokens.${family}`, reason: "token family 必须为档位对象" });
        continue;
      }
      for (const [scale, value] of Object.entries(scales)) {
        if (typeof value !== "string" || !value.trim()) {
          issues.push({
            path: `${presetPath}.tokens.${family}.${scale}`,
            reason: "token 值必须为非空字符串",
          });
        }
      }
    }
  }

  return issues;
}
