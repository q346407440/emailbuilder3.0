/**
 * 邮件字体白名单 — 机器真源。
 * tokenPresets `fonts.*`、template 字面量 `props.fontFamily`、Inspector 备选项均须落在此表 `persisted` 之一；
 * 画布 CSS `font-family` 由 `storedSingleFontToCssFamily` 按 `generic` 追加，禁止在 JSON 写逗号字体栈。
 */

export type FontFamilyId = "sourceSans3" | "segoeUi" | "arial" | "georgia";

export type FontGeneric = "serif" | "sans-serif";

export type FontFamilyCatalogEntry = {
  id: FontFamilyId;
  /** Inspector / 样式预设面板展示名 */
  label: string;
  /** tokenPresets.json、template 字面量落盘值（单一主字体，无逗号） */
  persisted: string;
  /** 渲染展开时追加的 CSS 通用族名 */
  generic: FontGeneric;
};

/** 有序白名单；扩展时只改此表并跑 `npm run validate:all`。 */
export const FONT_FAMILY_CATALOG: readonly FontFamilyCatalogEntry[] = [
  { id: "sourceSans3", label: "Source Sans 3", persisted: "'Source Sans 3'", generic: "sans-serif" },
  { id: "segoeUi", label: "Segoe UI", persisted: "'Segoe UI'", generic: "sans-serif" },
  { id: "arial", label: "Arial", persisted: "Arial", generic: "sans-serif" },
  { id: "georgia", label: "Georgia", persisted: "Georgia", generic: "serif" },
] as const;

/** 新建预设 / 无法识别时的默认档位 */
export const DEFAULT_FONT_FAMILY_ID: FontFamilyId = "sourceSans3";

const CATALOG_BY_ID = new Map<FontFamilyId, FontFamilyCatalogEntry>(
  FONT_FAMILY_CATALOG.map((e) => [e.id, e])
);

const CATALOG_BY_PERSISTED = new Map<string, FontFamilyCatalogEntry>(
  FONT_FAMILY_CATALOG.map((e) => [e.persisted, e])
);

export function getFontFamilyCatalogEntry(id: FontFamilyId): FontFamilyCatalogEntry {
  const entry = CATALOG_BY_ID.get(id);
  if (!entry) throw new Error(`未知字体档位 id: ${id}`);
  return entry;
}

export function getDefaultPersistedFont(): string {
  return getFontFamilyCatalogEntry(DEFAULT_FONT_FAMILY_ID).persisted;
}

export function findFontFamilyCatalogEntryByPersisted(
  persisted: string | undefined
): FontFamilyCatalogEntry | undefined {
  if (!persisted?.trim()) return undefined;
  const direct = CATALOG_BY_PERSISTED.get(persisted.trim());
  if (direct) return direct;
  return undefined;
}

export function listFontFamilyCatalogLabels(): string {
  return FONT_FAMILY_CATALOG.map((e) => e.label).join("、");
}
