import { TOKEN_PRESET_FAMILY_ORDER, TOKEN_PRESET_SCALE_ORDER } from "./standard-keys";
import type { TokenPresetFamily } from "./types";

/**
 * 模板中 `$themeRef` / `bindings.tokenPath` 允许指向的标准路径。
 * - `colors` / `fonts`：短路径（无 `tokens.` 前缀）
 * - `spacing` / `typography` / `radius`：带 `tokens.` 前缀
 */
export const STANDARD_THEME_REF_PATHS: readonly string[] = [
  ...TOKEN_PRESET_FAMILY_ORDER.flatMap((family) => {
    const scales = TOKEN_PRESET_SCALE_ORDER[family];
    const prefix = family === "colors" || family === "fonts" ? "" : "tokens.";
    return scales.map((scale) => `${prefix}${family}.${scale}`);
  }),
];

const STANDARD_THEME_REF_SET = new Set(STANDARD_THEME_REF_PATHS);

/** 是否为仓库标准 14 键之一（用于文档与可选 lint；字段能否挂 `$themeRef` 仍由 resolveThemeInTemplate 按字段路径判断） */
export function isStandardThemeRefPath(path: string): boolean {
  return STANDARD_THEME_REF_SET.has(path.trim());
}

/** 将 storage 路径 `colors.primary` 转为推荐 `$themeRef` 写法 */
export function themeRefPathForStorage(family: TokenPresetFamily, scale: string): string {
  if (family === "colors" || family === "fonts") return `${family}.${scale}`;
  return `tokens.${family}.${scale}`;
}
