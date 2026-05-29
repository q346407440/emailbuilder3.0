import type { EmailBlock, WrapperStyle } from "../types/email";

/** 可在 wrapperStyle 上配置底图的容器类 runtime type */
export type WrapperBackgroundImageBlockType = "emailRoot" | "layout" | "grid" | "image";

export function isWrapperBackgroundImageBlockType(
  type: EmailBlock["type"]
): type is WrapperBackgroundImageBlockType {
  return type === "emailRoot" || type === "layout" || type === "grid" || type === "image";
}

/** layout / grid：wrapperStyle.backgroundImage 对象存在时视为背景图模式已启用（src 可为空） */
export function layoutHasBackgroundImage(block: EmailBlock): boolean {
  if (block.type !== "layout" && block.type !== "grid") return false;
  const bi = block.wrapperStyle?.backgroundImage;
  return bi !== undefined && bi !== null;
}

/** layout / grid：wrapperStyle.backgroundImage.src 非空时视为可渲染 */
export function layoutBackgroundImageRenderable(block: EmailBlock): boolean {
  if (block.type !== "layout" && block.type !== "grid") return false;
  const src = block.wrapperStyle?.backgroundImage?.src;
  return typeof src === "string" && src.trim().length > 0;
}

/** emailRoot / image / layout / grid：wrapperStyle.backgroundImage 对象已配置 */
export function blockHasBackgroundImage(block: EmailBlock): boolean {
  if (!isWrapperBackgroundImageBlockType(block.type)) return false;
  const bi = block.wrapperStyle?.backgroundImage;
  return bi !== undefined && bi !== null;
}

/** emailRoot / image / layout / grid：backgroundImage.src 非空，可渲染底图 */
export function blockBackgroundImageRenderable(block: EmailBlock): boolean {
  if (block.type === "emailRoot") {
    const src = block.wrapperStyle?.backgroundImage?.src;
    return typeof src === "string" && src.trim().length > 0;
  }
  if (block.type === "layout" || block.type === "grid") return layoutBackgroundImageRenderable(block);
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

/** 从 wrapperStyle 移除容器背景图相关字段 */
export function stripBackgroundImageFromWrapper(ws: WrapperStyle | undefined): WrapperStyle | undefined {
  if (!ws || typeof ws !== "object") return ws;
  const next: Record<string, unknown> = { ...ws };
  delete next.backgroundImage;
  delete next.backgroundContentAlign;
  return next as WrapperStyle;
}
