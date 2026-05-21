import {
  findFontFamilyCatalogEntryByPersisted,
  FONT_FAMILY_CATALOG,
  getDefaultPersistedFont,
  getFontFamilyCatalogEntry,
  listFontFamilyCatalogLabels,
  type FontFamilyCatalogEntry,
  type FontGeneric,
} from "./catalog";

/** 主题未配置 fonts 档位时，`storedSingleFontToCssFamily` 的 fallback 单一主字体 */
export const DEFAULT_THEME_FONT_SINGLE = getDefaultPersistedFont();

/** 画布无字体时的完整 CSS font-family（由默认档位展开） */
export const DEFAULT_EMAIL_FONT_FAMILY = storedSingleFontToCssFamily(
  getDefaultPersistedFont(),
  getDefaultPersistedFont()
);

/** Inspector / 样式预设：备选项 value = 落盘 persisted */
export const EMAIL_FONT_FAMILY_OPTIONS = FONT_FAMILY_CATALOG.map((e) => ({
  label: e.label,
  value: e.persisted,
})) as ReadonlyArray<{ label: string; value: string }>;

const PERSISTED_WHITELIST_SET = new Set(FONT_FAMILY_CATALOG.map((e) => e.persisted));

/** 按 CSS font-family 列表规则拆分（逗号仅在引号外为分隔符）。 */
export function splitCssFontFamilyList(input: string): string[] {
  const s = input.trim();
  if (!s) return [];
  const parts: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      cur += c;
      continue;
    }
    if (c === ",") {
      const t = cur.trim();
      if (t) parts.push(t);
      cur = "";
      continue;
    }
    cur += c;
  }
  const last = cur.trim();
  if (last) parts.push(last);
  return parts;
}

export function stripOuterFontFamilyQuotes(token: string): string {
  let t = token.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === "'" && b === "'") || (a === '"' && b === '"')) {
      t = t.slice(1, -1).trim();
    }
  }
  return t;
}

/** 将裸字体名格式化为 CSS 单一 font-family 片段（必要时加引号）。 */
export function formatCssSingleFontFamilyToken(name: string): string {
  const n = name.trim();
  if (!n) return n;
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(n)) return n;
  return `'${n.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * 用户输入或旧数据中的 font-family 串 → 仅保留「第一种主字体」片段。
 * 返回 undefined 表示清空该项。
 */
export function normalizeThemeFontFamilyInput(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parts = splitCssFontFamilyList(trimmed);
  const first = parts[0];
  if (!first) return undefined;
  const name = stripOuterFontFamilyQuotes(first);
  if (!name) return undefined;
  return formatCssSingleFontFamilyToken(name);
}

function genericForBareName(bareLower: string): FontGeneric {
  if (bareLower === "serif" || (bareLower.includes("serif") && !bareLower.includes("sans"))) {
    return "serif";
  }
  return "sans-serif";
}

function genericForPersisted(persisted: string): FontGeneric {
  const entry = findFontFamilyCatalogEntryByPersisted(persisted);
  if (entry) return entry.generic;
  const bare = stripOuterFontFamilyQuotes(persisted).toLowerCase();
  return genericForBareName(bare);
}

/**
 * 主题或样式预设中存储的「单一主字体」→ 画布用的完整 CSS font-family（末尾附通用族名 fallback）。
 */
export function storedSingleFontToCssFamily(raw: string | undefined, fallbackSingle: string): string {
  const fallback = fallbackSingle.trim() ? fallbackSingle : DEFAULT_THEME_FONT_SINGLE;
  const single = raw?.trim() ? normalizeThemeFontFamilyInput(raw) ?? fallback : fallback;
  const generic = genericForPersisted(single);
  return `${single}, ${generic}`;
}

/** 系统 UI 栈落盘时统一为 Segoe UI。 */
function coerceTokenPresetStoredSingleFont(normalized: string, originalRaw: string): string {
  const bare = stripOuterFontFamilyQuotes(normalized).toLowerCase();
  const rawLower = originalRaw.toLowerCase();
  if (
    bare === "-apple-system" ||
    bare === "blinkmacsystemfont" ||
    rawLower.includes("blinkmacsystemfont") ||
    (rawLower.includes("segoe ui") && splitCssFontFamilyList(originalRaw.trim()).length > 1)
  ) {
    return getFontFamilyCatalogEntry("segoeUi").persisted;
  }
  return normalized;
}

function matchCatalogEntryByNormalizedSingle(singleKey: string): FontFamilyCatalogEntry | undefined {
  const direct = findFontFamilyCatalogEntryByPersisted(singleKey);
  if (direct) return direct;
  const bare = stripOuterFontFamilyQuotes(singleKey).toLowerCase();
  for (const entry of FONT_FAMILY_CATALOG) {
    const eb = stripOuterFontFamilyQuotes(entry.persisted).toLowerCase();
    if (eb === bare) return entry;
    if (bare.includes(eb) || eb.includes(bare)) return entry;
  }
  if (bare.includes("segoe")) return getFontFamilyCatalogEntry("segoeUi");
  if (bare.includes("source sans")) return getFontFamilyCatalogEntry("sourceSans3");
  if (bare.includes("georgia") || (bare.includes("serif") && !bare.includes("sans"))) {
    return getFontFamilyCatalogEntry("georgia");
  }
  if (bare.includes("helvetica") || bare.includes("arial")) return getFontFamilyCatalogEntry("arial");
  return undefined;
}

/**
 * 任意旧版字体串 → 白名单内 `persisted`（供落盘、Inspector 回显、ShopSelect value）。
 */
export function coercePersistedFontFamily(raw: unknown): string {
  const rawStr = typeof raw === "string" ? raw.trim() : "";
  if (!rawStr) return getDefaultPersistedFont();
  if (PERSISTED_WHITELIST_SET.has(rawStr)) return rawStr;
  const singleKey = normalizeThemeFontFamilyInput(rawStr);
  if (singleKey) {
    const matched = matchCatalogEntryByNormalizedSingle(singleKey);
    if (matched) return matched.persisted;
  }
  return getDefaultPersistedFont();
}

/** @deprecated 使用 `coercePersistedFontFamily`；保留别名供渐进替换 */
export const coerceRootCanvasFontFamilyToWhitelist = coercePersistedFontFamily;

/**
 * 画布渲染用：将 persisted 或旧栈解析为完整 CSS font-family。
 */
export function resolveRenderFontFamily(raw: unknown): string {
  const rawStr = typeof raw === "string" ? raw.trim() : "";
  if (!rawStr) return DEFAULT_EMAIL_FONT_FAMILY;
  if (splitCssFontFamilyList(rawStr).length > 1) {
    return storedSingleFontToCssFamily(rawStr, DEFAULT_THEME_FONT_SINGLE);
  }
  const persisted = coercePersistedFontFamily(rawStr);
  return storedSingleFontToCssFamily(persisted, DEFAULT_THEME_FONT_SINGLE);
}

/** @deprecated 画布请用 `resolveRenderFontFamily`；字面量落盘请用 `coercePersistedFontFamily` */
export function normalizeEmailFontFamily(value: unknown): string {
  return resolveRenderFontFamily(value);
}

export type TokenPresetFontStorageCheck =
  | { ok: true; normalized: string }
  | { ok: false; reason: string };

/**
 * `tokenPresets.json` 的 `fonts.heading` / `fonts.body` 落盘口径：
 * 须为 {@link FONT_FAMILY_CATALOG} 中的 `persisted` 之一。
 */
export function checkTokenPresetFontStorageValue(raw: string): TokenPresetFontStorageCheck {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "fonts 档位须为非空单一主字体" };
  }
  if (splitCssFontFamilyList(trimmed).length > 1) {
    return {
      ok: false,
      reason:
        "fonts 档位须为白名单内单一主字体（禁止逗号分隔的 CSS 字体栈；通用族名由渲染层自动追加）",
    };
  }
  const normalized = normalizeThemeFontFamilyInput(trimmed);
  if (!normalized) {
    return { ok: false, reason: "fonts 档位须为有效单一主字体" };
  }
  const coerced = coerceTokenPresetStoredSingleFont(normalized, trimmed);
  const entry = findFontFamilyCatalogEntryByPersisted(coerced) ?? matchCatalogEntryByNormalizedSingle(coerced);
  if (!entry) {
    return {
      ok: false,
      reason: `fonts 档位须为白名单主字体之一（${listFontFamilyCatalogLabels()}）`,
    };
  }
  return { ok: true, normalized: entry.persisted };
}

/** 将旧版字体栈收敛为 tokenPresets 可落盘的白名单 persisted。 */
export function normalizeTokenPresetFontStorageValue(raw: string): string | undefined {
  const checked = checkTokenPresetFontStorageValue(raw);
  if (checked.ok) return checked.normalized;
  const single = normalizeThemeFontFamilyInput(raw);
  if (!single) return undefined;
  const coerced = coerceTokenPresetStoredSingleFont(single, raw);
  const recheck = checkTokenPresetFontStorageValue(coerced);
  return recheck.ok ? recheck.normalized : undefined;
}
