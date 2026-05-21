import type { EmailBlock } from "../types/email";

export type WrapperFillAxis = "width" | "height";

/**
 * 规则：父级在同轴为 hug 时，子级 fill 会形成同轴循环依赖。
 * - 宽度轴：父级为横向 layout/image 且 widthMode=hug
 * - 高度轴：父级为纵向 layout/image 且 heightMode=hug
 */
export function isChildFillBlockedByParentHug(
  parentBlock: EmailBlock | undefined,
  axis: WrapperFillAxis
): boolean {
  if (!parentBlock) return false;
  if (parentBlock.type !== "layout" && parentBlock.type !== "image") return false;
  const direction = parentBlock.props.direction ?? "vertical";
  if (axis === "width") {
    return direction === "horizontal" && parentBlock.wrapperStyle?.widthMode === "hug";
  }
  return direction === "vertical" && parentBlock.wrapperStyle?.heightMode === "hug";
}

export function getWrapperModeHint(axis: WrapperFillAxis, fillBlocked: boolean): string {
  if (!fillBlocked) {
    return axis === "width"
      ? "跟随内容（hug）；铺满父级（fill）；自定义（fixed）需填写固定宽度"
      : "跟随内容（hug）；铺满父级（fill）；自定义（fixed）需填写固定高度";
  }
  return axis === "width"
    ? "父级为横向 layout/image 且宽度模式为跟随内容（hug）时，当前区块铺满父级（fill）会形成同轴循环依赖，已禁用。"
    : "父级为纵向 layout/image 且高度模式为跟随内容（hug）时，当前区块铺满父级（fill）会形成同轴循环依赖，已禁用。";
}

export function getFillOptionTitle(axis: WrapperFillAxis, fillBlocked: boolean): string | undefined {
  if (!fillBlocked) return undefined;
  return axis === "width"
    ? "父级宽度模式为跟随内容（hug）时不可用"
    : "父级高度模式为跟随内容（hug）时不可用";
}

export function getFillValidationReason(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "父级为横向 layout/image（表格行槽）且宽度模式为 hug 时，子级不允许使用 fill（会产生同轴循环依赖）；请改为 hug 或 fixed"
    : "父级为纵向 layout/image（单列堆叠槽）且高度模式为 hug 时，子级不允许使用 fill（会产生同轴循环依赖）；请改为 hug 或 fixed";
}
