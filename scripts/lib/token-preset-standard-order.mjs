/**
 * 与 src/lib/tokenPresetStandardOrder.ts 保持同一套标准键序（供 .mjs 脚本使用）。
 */

export const TOKEN_PRESET_FAMILY_ORDER = [
  "colors",
  "fonts",
  "spacing",
  "typography",
  "radius",
];

export const TOKEN_PRESET_SCALE_ORDER = {
  colors: ["primary", "secondary", "surface"],
  fonts: ["heading", "body"],
  spacing: ["section", "gap", "pageInline"],
  typography: ["display", "h1", "body", "caption"],
  radius: ["panel", "cta"],
};

function compareByOrderList(ids, a, b) {
  const rank = new Map(ids.map((id, index) => [id, index]));
  const ra = rank.get(a) ?? Number.POSITIVE_INFINITY;
  const rb = rank.get(b) ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b);
}

export function sortTokenPresetFamilies(families) {
  return [...families].sort((a, b) => compareByOrderList(TOKEN_PRESET_FAMILY_ORDER, a, b));
}

export function sortTokenPresetScales(family, scales) {
  const known = TOKEN_PRESET_SCALE_ORDER[family];
  if (!known) return [...scales].sort((a, b) => a.localeCompare(b));
  return [...scales].sort((a, b) => compareByOrderList(known, a, b));
}

/** @param {Record<string, Record<string, string>>} tokens */
export function normalizeTokenPresetTokens(tokens) {
  const out = {};
  for (const family of sortTokenPresetFamilies(Object.keys(tokens ?? {}))) {
    const scales = tokens[family];
    if (!scales) continue;
    const ordered = {};
    for (const scale of sortTokenPresetScales(family, Object.keys(scales))) {
      ordered[scale] = scales[scale];
    }
    out[family] = ordered;
  }
  return out;
}
