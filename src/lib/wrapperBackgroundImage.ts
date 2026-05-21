import type { EmailBlock, WrapperStyle } from "../types/email";

/** layout 且 wrapperStyle.backgroundImage 对象存在时视为背景图模式已启用（src 可为空） */
export function layoutHasBackgroundImage(block: EmailBlock): boolean {
  if (block.type !== "layout") return false;
  const bi = block.wrapperStyle?.backgroundImage;
  return bi !== undefined && bi !== null;
}

/** layout 且 wrapperStyle.backgroundImage.src 非空时视为可渲染（供 EmailPreview / validate 使用） */
export function layoutBackgroundImageRenderable(block: EmailBlock): boolean {
  if (block.type !== "layout") return false;
  const src = block.wrapperStyle?.backgroundImage?.src;
  return typeof src === "string" && src.trim().length > 0;
}

/** emailRoot / image / layout：wrapperStyle.backgroundImage 对象已配置 */
export function blockHasBackgroundImage(block: EmailBlock): boolean {
  if (block.type !== "emailRoot" && block.type !== "layout" && block.type !== "image") return false;
  const bi = block.wrapperStyle?.backgroundImage;
  return bi !== undefined && bi !== null;
}

/** emailRoot / image / layout：backgroundImage.src 非空，可渲染底图 + 叠放层 */
export function blockBackgroundImageRenderable(block: EmailBlock): boolean {
  if (block.type === "emailRoot") {
    const src = block.wrapperStyle?.backgroundImage?.src;
    return typeof src === "string" && src.trim().length > 0;
  }
  if (block.type === "layout") return layoutBackgroundImageRenderable(block);
  if (block.type === "image") {
    const src = block.wrapperStyle?.backgroundImage?.src;
    return typeof src === "string" && src.trim().length > 0;
  }
  return false;
}

/** 将纯数字或无前缀长度规范为 px，供 CSS height/width 使用 */
export function normalizeCssLengthPx(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const v = String(raw).trim();
  if (!v || v === "auto") return v || undefined;
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** 从 wrapperStyle 移除容器背景图相关字段（还原为普通 layout） */
export function stripBackgroundImageFromWrapper(ws: WrapperStyle | undefined): WrapperStyle | undefined {
  if (!ws || typeof ws !== "object") return ws;
  const next: Record<string, unknown> = { ...ws };
  delete next.backgroundImage;
  delete next.backgroundContentAlign;
  return next as WrapperStyle;
}
