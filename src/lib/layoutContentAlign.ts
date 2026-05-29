import type { EmailBlock } from "../types/email";

export function layoutMainAxisForDirection(block: EmailBlock): "horizontal" | "vertical" {
  if (block.type !== "layout") return "vertical";
  const dir = (block.props as { direction?: string } | undefined)?.direction;
  return dir === "horizontal" ? "horizontal" : "vertical";
}

/** 历史函数保留为无操作：contentAlign 已升级为所有容器双轴。 */
export function stripLayoutContentAlignWrongAxis(block: EmailBlock): boolean {
  void block;
  return false;
}

/** 补齐 layout 双轴 contentAlign，供加载规范化。 */
export function ensureLayoutContentAlignPersisted(block: EmailBlock): boolean {
  if (block.type !== "layout") return false;
  const ws = (block.wrapperStyle ?? {}) as NonNullable<EmailBlock["wrapperStyle"]>;
  block.wrapperStyle = ws;
  let changed = false;
  const ca = ws.contentAlign as { horizontal?: unknown; vertical?: unknown } | undefined;
  const horizontal = ca?.horizontal;
  const vertical = ca?.vertical;
  if (
    horizontal !== "left" &&
    horizontal !== "center" &&
    horizontal !== "right"
  ) {
    ws.contentAlign = { ...ws.contentAlign, horizontal: "left" };
    changed = true;
  }
  if (vertical !== "top" && vertical !== "center" && vertical !== "bottom") {
    ws.contentAlign = { ...ws.contentAlign, vertical: "top" };
    changed = true;
  }
  return changed;
}
