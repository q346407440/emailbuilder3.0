import type { EmailBlock, WrapperContentAlign } from "../types/email";

export type WrapperContentAlignHorizontal = "left" | "center" | "right";
export type WrapperContentAlignVertical = "top" | "center" | "bottom";

export const DEFAULT_WRAPPER_CONTENT_ALIGN: Required<WrapperContentAlign> = {
  horizontal: "left",
  vertical: "top",
};

export function normalizeWrapperContentAlign(raw: unknown): Required<WrapperContentAlign> {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const horizontal =
    value.horizontal === "center" || value.horizontal === "right" || value.horizontal === "left"
      ? value.horizontal
      : DEFAULT_WRAPPER_CONTENT_ALIGN.horizontal;
  const vertical =
    value.vertical === "center" || value.vertical === "bottom" || value.vertical === "top"
      ? value.vertical
      : DEFAULT_WRAPPER_CONTENT_ALIGN.vertical;
  return { horizontal, vertical };
}

/** 为所有普通 block 补齐容器内内容九宫格对齐。emailRoot 的根级堆叠仍由根配置单独管理。 */
export function ensureWrapperContentAlignPersisted(block: EmailBlock): boolean {
  if (block.type === "emailRoot") return false;
  const ws = (block.wrapperStyle ?? {}) as NonNullable<EmailBlock["wrapperStyle"]>;
  block.wrapperStyle = ws;
  const next = normalizeWrapperContentAlign(ws.contentAlign);
  const current = ws.contentAlign as WrapperContentAlign | undefined;
  if (current?.horizontal === next.horizontal && current?.vertical === next.vertical) {
    return false;
  }
  ws.contentAlign = next;
  return true;
}
