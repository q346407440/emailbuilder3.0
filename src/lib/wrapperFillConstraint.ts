import type { EmailBlock, EmailTemplate, WrapperStyle } from "../types/email";
import { hasSiblingDimensionAnchor } from "./wrapperHugConstraint";

export type WrapperFillAxis = "width" | "height";

export type WrapperDimensionModeChange = {
  blockId: string;
  axis: WrapperFillAxis;
  from: string;
  to: "hug";
};

/**
 * 规则：父级 layout/image 在某一轴为 hug 时，子级同轴 fill 可能形成循环依赖（PRD §4.1）。
 * 若同级兄弟中已有该轴尺寸锚点（fixed / hug 内容等），则当前子级 fill 可解析（如横排左图 fill 高、右栏撑高）。
 */
export function isChildFillBlockedByParentHug(
  template: EmailTemplate,
  childBlockId: string,
  axis: WrapperFillAxis
): boolean {
  const child = template.blocks[childBlockId];
  if (!child?.parentId) return false;
  const parent = template.blocks[child.parentId];
  if (!parent || (parent.type !== "layout" && parent.type !== "image")) return false;

  const parentHugOnAxis =
    axis === "width"
      ? parent.wrapperStyle?.widthMode === "hug"
      : parent.wrapperStyle?.heightMode === "hug";
  if (!parentHugOnAxis) return false;

  return !hasSiblingDimensionAnchor(template, childBlockId, axis);
}

export function getWrapperModeHint(axis: WrapperFillAxis, fillBlocked: boolean): string {
  if (!fillBlocked) {
    return axis === "width"
      ? "跟随内容（hug）；铺满父级（fill）；自定义（fixed）需填写固定宽度"
      : "跟随内容（hug）；铺满父级（fill）；自定义（fixed）需填写固定高度";
  }
  return axis === "width"
    ? "父级宽度为跟随内容（hug）且同级兄弟均无宽度锚点时，当前区块宽度铺满（fill）会形成循环依赖，已禁用。"
    : "父级高度为跟随内容（hug）且同级兄弟均无高度锚点时，当前区块高度铺满（fill）会形成循环依赖，已禁用。";
}

export function getFillOptionTitle(axis: WrapperFillAxis, fillBlocked: boolean): string | undefined {
  if (!fillBlocked) return undefined;
  return axis === "width"
    ? "父级 hug 且同级无宽度锚点时不可用"
    : "父级 hug 且同级无高度锚点时不可用";
}

export function getFillValidationReason(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "父级 layout/image 宽度模式为 hug 且同级兄弟均无宽度锚点时，子级不允许使用 width fill（循环依赖）；请改为 hug 或 fixed，或让兄弟提供宽度锚点"
    : "父级 layout/image 高度模式为 hug 且同级兄弟均无高度锚点时，子级不允许使用 height fill（循环依赖）；请改为 hug 或 fixed，或让兄弟提供高度锚点";
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
  const ws = target.wrapperStyle;
  if (!ws) {
    return { wrapperStyle: ws, changed: false, changes: [] };
  }

  const changes: WrapperDimensionModeChange[] = [];
  let nextWs = ws;

  if (isChildFillBlockedByParentHug(template, blockId, "width") && ws.widthMode === "fill") {
    changes.push({ blockId, axis: "width", from: "fill", to: FALLBACK_MODE });
    nextWs = { ...nextWs, widthMode: FALLBACK_MODE };
  }
  if (isChildFillBlockedByParentHug(template, blockId, "height") && ws.heightMode === "fill") {
    changes.push({ blockId, axis: "height", from: "fill", to: FALLBACK_MODE });
    nextWs = { ...nextWs, heightMode: FALLBACK_MODE };
  }

  if (changes.length === 0) {
    return { wrapperStyle: ws, changed: false, changes: [] };
  }
  return { wrapperStyle: nextWs, changed: true, changes };
}
