import type { EmailBlock, EmailTemplate, WrapperStyle } from "../types/email";

export type WrapperFillAxis = "width" | "height";

export type WrapperDimensionModeChange = {
  blockId: string;
  axis: WrapperFillAxis;
  from: string;
  to: "hug";
};

/**
 * 规则：父级 layout/image 在某一轴为 hug 时，子级同轴 fill 会形成循环依赖（PRD §4.1）。
 * - 宽度轴：父级 widthMode=hug → 子级禁止 width fill（纵排交叉轴 / 横排主轴均适用）
 * - 高度轴：父级 heightMode=hug 且排列方向为纵向 → 子级禁止 height fill
 */
export function isChildFillBlockedByParentHug(
  parentBlock: EmailBlock | undefined,
  axis: WrapperFillAxis
): boolean {
  if (!parentBlock) return false;
  if (parentBlock.type !== "layout" && parentBlock.type !== "image") return false;
  const direction = parentBlock.props.direction ?? "vertical";
  if (axis === "width") {
    return parentBlock.wrapperStyle?.widthMode === "hug";
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
    ? "父级 layout/image 宽度模式为跟随内容（hug）时，当前区块宽度铺满（fill）会形成循环依赖，已禁用。"
    : "父级为纵向 layout/image 且高度模式为跟随内容（hug）时，当前区块高度铺满（fill）会形成循环依赖，已禁用。";
}

export function getFillOptionTitle(axis: WrapperFillAxis, fillBlocked: boolean): string | undefined {
  if (!fillBlocked) return undefined;
  return axis === "width"
    ? "父级宽度模式为跟随内容（hug）时不可用"
    : "父级高度模式为跟随内容（hug）时不可用";
}

export function getFillValidationReason(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "父级 layout/image 宽度模式为 hug 时，子级不允许使用 width fill（父宽随子、子宽铺满父，循环依赖）；请改为 hug 或 fixed"
    : "父级为纵向 layout/image 且高度模式为 hug 时，子级不允许使用 height fill（循环依赖）；请改为 hug 或 fixed";
}

const FALLBACK_MODE = "hug" as const;

/**
 * 子级 fill 在父级 hug 同轴下非法时，回落为 hug（协调层 / 迁移共用）。
 */
export function normalizeBlockWrapperDimensionModes(
  template: EmailTemplate,
  blockId: string,
  block?: EmailBlock
): {
  wrapperStyle: WrapperStyle | undefined;
  changed: boolean;
  changes: WrapperDimensionModeChange[];
} {
  const target = block ?? template.blocks[blockId];
  if (!target || target.type === "emailRoot") {
    return { wrapperStyle: target?.wrapperStyle, changed: false, changes: [] };
  }
  const parent = target.parentId ? template.blocks[target.parentId] : undefined;
  const ws = target.wrapperStyle;
  if (!ws) {
    return { wrapperStyle: ws, changed: false, changes: [] };
  }

  const changes: WrapperDimensionModeChange[] = [];
  let nextWs = ws;

  if (isChildFillBlockedByParentHug(parent, "width") && ws.widthMode === "fill") {
    changes.push({ blockId, axis: "width", from: "fill", to: FALLBACK_MODE });
    nextWs = { ...nextWs, widthMode: FALLBACK_MODE };
  }
  if (isChildFillBlockedByParentHug(parent, "height") && ws.heightMode === "fill") {
    changes.push({ blockId, axis: "height", from: "fill", to: FALLBACK_MODE });
    nextWs = { ...nextWs, heightMode: FALLBACK_MODE };
  }

  if (changes.length === 0) {
    return { wrapperStyle: ws, changed: false, changes: [] };
  }
  return { wrapperStyle: nextWs, changed: true, changes };
}
