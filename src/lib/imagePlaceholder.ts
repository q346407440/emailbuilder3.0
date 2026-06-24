/** 本地静态图片占位（RestoreAst 搜图失败回落）。 */
export const IMAGE_PLACEHOLDER_PUBLIC_PATH = "/static-assets/image-placeholder.png";

/** 与 IconGlyph 留空占位一致：空心菱形字元 + 默认色（勿改字形，回填 URL 仅用于落盘/发信）。 */
export const ICON_EMPTY_GLYPH = "◇";
export const ICON_EMPTY_GLYPH_COLOR = "#94a3b8";

/** 图标 CDN 未命中时写入 template.props.src；预览仍走 ICON_EMPTY_GLYPH 渲染。 */
export const ICON_PLACEHOLDER_PUBLIC_PATH = "/static-assets/icon-placeholder.svg";

export function isIconPlaceholderSrc(src: string | undefined | null): boolean {
  const normalized = (src ?? "").trim();
  if (!normalized) return true;
  return (
    normalized === ICON_PLACEHOLDER_PUBLIC_PATH ||
    normalized.endsWith("/icon-placeholder.svg")
  );
}
