import type { EmailBlock } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { isThemeRef } from "../types/themeRef";
import { readTokenPresetStorageValue } from "./resolveTokenPreset";

/** 当前邮件无 tokenPresets 或路径缺失时的插入块字面量兜底（与新建模板 scaffold 对齐）。 */
const INSERT_THEME_LITERAL_FALLBACKS: Record<string, string> = {
  "colors.primary": "#111111",
  "colors.secondary": "#666666",
  "colors.surface": "#ffffff",
  "tokens.spacing.section": "16px",
  "tokens.spacing.gap": "8px",
  "tokens.spacing.pageInline": "16px",
  "tokens.typography.body": "14px",
  "tokens.radius.panel": "0",
  "tokens.radius.cta": "0",
};

function resolveThemeRefLiteral(tokenPath: string, tokenPresets: TokenPresets | null | undefined): string {
  const trimmed = tokenPath.trim();
  const fromPreset = readTokenPresetStorageValue(tokenPresets, trimmed);
  return fromPreset ?? INSERT_THEME_LITERAL_FALLBACKS[trimmed] ?? "#111111";
}

function deepMaterializeThemeRefs(
  value: unknown,
  tokenPresets: TokenPresets | null | undefined
): unknown {
  if (isThemeRef(value)) {
    return resolveThemeRefLiteral(value.$themeRef, tokenPresets);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepMaterializeThemeRefs(item, tokenPresets));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepMaterializeThemeRefs(v, tokenPresets);
    }
    return out;
  }
  return value;
}

/** 将母版块中的 `$themeRef` 展开为字面量，便于插入当前邮件画布。 */
export function prepareCatalogBlockForInsert(
  block: EmailBlock,
  tokenPresets: TokenPresets | null | undefined
): EmailBlock {
  return {
    ...block,
    props: deepMaterializeThemeRefs(block.props, tokenPresets) as EmailBlock["props"],
    wrapperStyle: deepMaterializeThemeRefs(block.wrapperStyle, tokenPresets) as EmailBlock["wrapperStyle"],
  };
}
