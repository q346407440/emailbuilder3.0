import type { TokenPresetFamily, TokenPresetStandardKey } from "./types";

/**
 * 样式预设标准 14 键 — 机器真源（与 `email-token-preset-standard-scope` 技能对齐）。
 * 样例：`data/emails/on-cart-abandon-2/tokenPresets.json`、`data/token-presets/public-neutral-saas.json`。
 */

export const TOKEN_PRESET_FAMILY_ORDER = [
  "colors",
  "fonts",
  "spacing",
  "typography",
  "radius",
] as const satisfies readonly TokenPresetFamily[];

export const TOKEN_PRESET_SCALE_ORDER: Readonly<Record<TokenPresetFamily, readonly string[]>> = {
  colors: ["primary", "secondary", "surface"],
  fonts: ["heading", "body"],
  spacing: ["section", "gap", "pageInline"],
  typography: ["display", "h1", "body", "caption"],
  radius: ["panel", "cta"],
};

/** 14 个标准 family.scale 条目（固定顺序） */
export const TOKEN_PRESET_STANDARD_KEYS: readonly TokenPresetStandardKey[] =
  TOKEN_PRESET_FAMILY_ORDER.flatMap((family) =>
    (TOKEN_PRESET_SCALE_ORDER[family] ?? []).map((scale) => ({ family, scale }))
  );

/** `presets.*.tokens` 在 ExpandedTheme 中的点路径，如 `colors.primary` */
export function tokenStoragePath(family: TokenPresetFamily, scale: string): string {
  return `${family}.${scale}`;
}

function compareByOrderList(ids: readonly string[], a: string, b: string): number {
  const rank = new Map(ids.map((id, index) => [id, index]));
  const ra = rank.get(a) ?? Number.POSITIVE_INFINITY;
  const rb = rank.get(b) ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

export function sortTokenPresetFamilies(families: Iterable<string>): string[] {
  return [...families].sort((a, b) => compareByOrderList(TOKEN_PRESET_FAMILY_ORDER, a, b));
}

export function sortTokenPresetScales(family: string, scales: Iterable<string>): string[] {
  const known = TOKEN_PRESET_SCALE_ORDER[family as TokenPresetFamily];
  if (!known) return [...scales].sort((a, b) => a.localeCompare(b));
  return [...scales].sort((a, b) => compareByOrderList(known, a, b));
}

export function normalizeTokenPresetTokens<T extends Record<string, Record<string, string>>>(
  tokens: T
): T {
  const out = {} as T;
  for (const family of sortTokenPresetFamilies(Object.keys(tokens))) {
    const scales = tokens[family];
    if (!scales) continue;
    const ordered = {} as Record<string, string>;
    for (const scale of sortTokenPresetScales(family, Object.keys(scales))) {
      ordered[scale] = scales[scale]!;
    }
    (out as Record<string, Record<string, string>>)[family] = ordered;
  }
  return out;
}

export function isStandardTokenFamily(family: string): family is TokenPresetFamily {
  return (TOKEN_PRESET_FAMILY_ORDER as readonly string[]).includes(family);
}

export function isStandardTokenScale(family: TokenPresetFamily, scale: string): boolean {
  return (TOKEN_PRESET_SCALE_ORDER[family] ?? []).includes(scale);
}
