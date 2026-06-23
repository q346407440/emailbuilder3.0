import type { AlignMain } from "./types";

/** 横排直接子块的父级上下文（仅 widthMode 决策所需字段）。 */
export type RowChildWidthParentContext = {
  inDirectRow?: boolean;
  rowAlign?: AlignMain;
};

/**
 * 横排直接子块 wrapper widthMode。
 * `align:between` → gapMode auto（space-between），子级须 hug 才能插入缝隙列；
 * 其余横排直子默认 fill（栏内换行等）。
 */
export function resolveDirectRowChildWrapperWidthMode(
  parent: RowChildWidthParentContext,
  opts?: { forceFill?: boolean }
): "fill" | "hug" {
  if (opts?.forceFill) return "fill";
  if (parent.inDirectRow && parent.rowAlign === "between") return "hug";
  return "fill";
}
