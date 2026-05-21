/**
 * @deprecated 实现已迁至 `src/font-family-contract/`；本文件仅作稳定导入路径。
 */
export {
  checkTokenPresetFontStorageValue,
  coercePersistedFontFamily,
  coerceRootCanvasFontFamilyToWhitelist,
  DEFAULT_EMAIL_FONT_FAMILY,
  DEFAULT_THEME_FONT_SINGLE,
  EMAIL_FONT_FAMILY_OPTIONS,
  formatCssSingleFontFamilyToken,
  normalizeEmailFontFamily,
  normalizeThemeFontFamilyInput,
  normalizeTokenPresetFontStorageValue,
  resolveRenderFontFamily,
  splitCssFontFamilyList,
  storedSingleFontToCssFamily,
  stripOuterFontFamilyQuotes,
  type TokenPresetFontStorageCheck,
} from "../font-family-contract";

/** @deprecated 使用 `getFontFamilyCatalogEntry("segoeUi").persisted` */
export { getFontFamilyCatalogEntry as _getFontFamilyCatalogEntry } from "../font-family-contract/catalog";

import { getFontFamilyCatalogEntry } from "../font-family-contract/catalog";

/** @deprecated 使用 catalog `segoeUi` 档位 */
export const PERSISTED_SEGOE_UI_FONT = getFontFamilyCatalogEntry("segoeUi").persisted;
