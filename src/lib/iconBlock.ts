import type { EmailBlock } from "../types/email";

export function readIconBlockProps(block: Extract<EmailBlock, { type: "icon" }>) {
  const props = block.props ?? {};
  return {
    src: typeof props.src === "string" ? props.src.trim() : "",
    color: typeof props.color === "string" ? props.color.trim() : "",
    size: typeof props.size === "string" ? props.size.trim() : "",
  };
}

/** 预览用：解析后的图标地址（JSON 真源为 props.src URL） */
export function resolveIconPreviewSrc(block: Extract<EmailBlock, { type: "icon" }>): string {
  return readIconBlockProps(block).src;
}

export function resolveIconPreviewColor(block: Extract<EmailBlock, { type: "icon" }>): string | undefined {
  const c = readIconBlockProps(block).color;
  return c || undefined;
}
