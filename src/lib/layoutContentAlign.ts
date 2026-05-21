import type { EmailBlock } from "../types/email";
import { normalizeLayoutStackDirection } from "../render-defaults-contract/values";

export function layoutMainAxisForDirection(block: EmailBlock): "horizontal" | "vertical" {
  if (block.type !== "layout") return "vertical";
  return normalizeLayoutStackDirection((block.props as { direction?: string } | undefined)?.direction);
}

/** 历史函数保留为无操作：contentAlign 已升级为所有容器双轴九宫格。 */
export function stripLayoutContentAlignWrongAxis(block: EmailBlock): boolean {
  void block;
  return false;
}

/** 横向 hug 行 / 纵向 hug 列：曾用 placement 表达组内居中 → fill + 主轴 contentAlign */
export function normalizeLayoutContentAlign(block: EmailBlock): boolean {
  if (block.type !== "layout") return false;
  const props = block.props as { direction?: string } | undefined;
  const ws = (block.wrapperStyle ?? {}) as NonNullable<EmailBlock["wrapperStyle"]>;
  block.wrapperStyle = ws;
  let changed = stripLayoutContentAlignWrongAxis(block);

  const isHorizontal = normalizeLayoutStackDirection(props?.direction) === "horizontal";
  const placement = ws.placement ?? { horizontal: "start", vertical: "start" };

  if (isHorizontal) {
    const wm = ws.widthMode ?? "fill";
    if (
      wm === "hug" &&
      placement.horizontal === "center" &&
      (!ws.contentAlign?.horizontal || ws.contentAlign.horizontal === "left")
    ) {
      ws.widthMode = "fill";
      ws.contentAlign = { ...ws.contentAlign, horizontal: "center" };
      ws.placement = { ...placement, horizontal: "start" };
      changed = true;
    }
  } else {
    const hm = ws.heightMode ?? "hug";
    if (
      hm === "hug" &&
      placement.vertical === "center" &&
      (!ws.contentAlign?.vertical || ws.contentAlign.vertical === "top")
    ) {
      ws.heightMode = "fill";
      ws.contentAlign = { ...ws.contentAlign, vertical: "center" };
      ws.placement = { ...placement, vertical: "start" };
      changed = true;
    }
  }

  if (stripLayoutContentAlignWrongAxis(block)) changed = true;
  return changed;
}

/** 补齐 layout 双轴 contentAlign，供存量模板与加载规范化。 */
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
