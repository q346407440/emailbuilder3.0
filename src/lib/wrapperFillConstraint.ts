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

/**
 * 按钮胶囊本体 fill 约束：外层容器（同块 wrapperStyle）在某一轴为 hug 时，
 * 胶囊同轴 fill 会形成循环依赖（与 layout 子级 fill 规则同构，父级换成本块外壳）。
 */
export function isButtonBodyFillBlockedByWrapperHug(
  buttonBlock: EmailBlock,
  axis: WrapperFillAxis
): boolean {
  if (buttonBlock.type !== "button") return false;
  if (axis === "width") {
    return buttonBlock.wrapperStyle?.widthMode === "hug";
  }
  return buttonBlock.wrapperStyle?.heightMode === "hug";
}

export function getButtonBodyFillValidationReason(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "按钮外层容器宽度模式为 hug 时，胶囊本体不允许使用 width fill（外层随胶囊、胶囊铺满外层，循环依赖）；请改为 hug 或 fixed"
    : "按钮外层容器高度模式为 hug 时，胶囊本体不允许使用 height fill（循环依赖）；请改为 hug 或 fixed";
}

export function getButtonBodyModeHint(
  axis: WrapperFillAxis,
  fillBlocked: boolean,
  baseHint: string
): string {
  if (!fillBlocked) return baseHint;
  return axis === "width"
    ? "外层容器宽度为跟随内容（hug）时，胶囊宽度铺满（fill）会形成循环依赖，已禁用。"
    : "外层容器高度为跟随内容（hug）时，胶囊高度铺满（fill）会形成循环依赖，已禁用。";
}

export function getButtonBodyFillOptionTitle(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "外层容器宽度为跟随内容（hug）时不可用"
    : "外层容器高度为跟随内容（hug）时不可用";
}

export type ButtonBodyDimensionModeChange = {
  blockId: string;
  axis: WrapperFillAxis;
  from: string;
  to: "hug";
};

/** 按钮胶囊 fill 在外层 hug 同轴下非法时，回落为 hug（协调层共用）。 */
export function normalizeButtonBodyDimensionModes(
  _template: EmailTemplate,
  blockId: string,
  block?: EmailBlock
): {
  props: EmailBlock["props"] | undefined;
  changed: boolean;
  changes: ButtonBodyDimensionModeChange[];
} {
  const target = block ?? _template.blocks[blockId];
  if (!target || target.type !== "button") {
    return { props: target?.props, changed: false, changes: [] };
  }
  const props = target.props as Record<string, unknown> | undefined;
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return { props: target.props, changed: false, changes: [] };
  }
  const rawStyle = props.buttonStyle;
  if (!rawStyle || typeof rawStyle !== "object" || Array.isArray(rawStyle)) {
    return { props: target.props, changed: false, changes: [] };
  }
  const buttonStyle = { ...(rawStyle as Record<string, unknown>) };
  const changes: ButtonBodyDimensionModeChange[] = [];

  if (isButtonBodyFillBlockedByWrapperHug(target, "width") && buttonStyle.widthMode === "fill") {
    buttonStyle.widthMode = "hug";
    changes.push({ blockId, axis: "width", from: "fill", to: FALLBACK_MODE });
  }
  if (isButtonBodyFillBlockedByWrapperHug(target, "height") && buttonStyle.heightMode === "fill") {
    buttonStyle.heightMode = "hug";
    changes.push({ blockId, axis: "height", from: "fill", to: FALLBACK_MODE });
  }

  if (changes.length === 0) {
    return { props: target.props, changed: false, changes: [] };
  }
  return {
    props: { ...props, buttonStyle },
    changed: true,
    changes,
  };
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
