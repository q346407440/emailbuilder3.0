import type { EmailBlock, EmailTemplate, WrapperStyle } from "../types/email";
import type { WrapperFillAxis } from "./wrapperFillConstraint";
import { getWrapperModeHint } from "./wrapperFillConstraint";

export type ContainerHugDimensionModeChange = {
  blockId: string;
  axis: WrapperFillAxis;
  from: "hug";
  to: "fill";
};

/** 容器 hug 需子级提供尺寸锚点：layout / grid / image / emailRoot。 */
export function isHugConstraintContainer(block: EmailBlock | undefined): boolean {
  if (!block) return false;
  return (
    block.type === "layout" ||
    block.type === "grid" ||
    block.type === "image" ||
    block.type === "emailRoot"
  );
}

function isNonemptyFixedDimension(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "" && value.trim() !== "auto";
}

function readAxisMode(block: EmailBlock, axis: WrapperFillAxis): string | undefined {
  const ws = block.wrapperStyle;
  if (!ws) return undefined;
  return axis === "width" ? ws.widthMode : ws.heightMode;
}

type ChildBlocksAccessor = (block: EmailBlock) => EmailBlock[];

function blockProvidesDimensionAnchorCore(
  block: EmailBlock,
  axis: WrapperFillAxis,
  getChildBlocks: ChildBlocksAccessor
): boolean {
  const mode = readAxisMode(block, axis);
  const fixedValue =
    axis === "width" ? block.wrapperStyle?.width : block.wrapperStyle?.height;

  if (mode === "fixed") {
    return isNonemptyFixedDimension(fixedValue);
  }
  if (mode === "fill" || mode === undefined) {
    if (
      (block.type === "layout" || block.type === "grid" || block.type === "image") &&
      getChildBlocks(block).length > 0
    ) {
      return getChildBlocks(block).some((child) =>
        blockProvidesDimensionAnchorCore(child, axis, getChildBlocks)
      );
    }
    return false;
  }

  if (block.type === "text" || block.type === "icon") {
    return true;
  }

  if (block.type === "button") {
    const rawStyle = block.props?.buttonStyle;
    if (!rawStyle || typeof rawStyle !== "object" || Array.isArray(rawStyle)) {
      return false;
    }
    const buttonStyle = rawStyle as Record<string, unknown>;
    const bodyMode = axis === "width" ? buttonStyle.widthMode : buttonStyle.heightMode;
    const bodyFixed = axis === "width" ? buttonStyle.width : buttonStyle.height;
    if (bodyMode === "fixed" && isNonemptyFixedDimension(bodyFixed)) {
      return true;
    }
    if (bodyMode === "hug" || bodyMode === undefined) {
      return true;
    }
    return false;
  }

  if (block.type === "image") {
    const axisFixed =
      axis === "width" ? block.wrapperStyle?.width : block.wrapperStyle?.height;
    if (isNonemptyFixedDimension(axisFixed)) {
      return true;
    }
    return false;
  }

  if (block.type === "divider") {
    if (axis === "height" && isNonemptyFixedDimension(block.props?.height)) {
      return true;
    }
    if (axis === "width") {
      const lineMode = block.props?.lineWidthMode;
      if (lineMode === "fixed" && isNonemptyFixedDimension(block.props?.lineWidth)) {
        return true;
      }
    }
    return false;
  }

  if (block.type === "progress") {
    if (axis === "height" && isNonemptyFixedDimension(block.props?.barHeight)) {
      return true;
    }
    const barMode =
      axis === "width" ? block.props?.barWidthMode : block.props?.barHeightMode;
    const barFixed =
      axis === "width" ? block.props?.barWidth : block.props?.barHeight;
    if (barMode === "fixed" && isNonemptyFixedDimension(barFixed)) {
      return true;
    }
    return false;
  }

  if (block.type === "grid") {
    const props = block.props;
    if (axis === "height") {
      if (
        props?.cellHeightMode === "fixed" &&
        isNonemptyFixedDimension(props?.cellHeight)
      ) {
        return true;
      }
    }
    if (axis === "width") {
      if (
        props?.cellWidthMode === "fixed" &&
        isNonemptyFixedDimension(props?.cellWidth)
      ) {
        return true;
      }
    }
  }

  const childBlocks = getChildBlocks(block);
  if (childBlocks.length === 0) {
    return false;
  }
  return childBlocks.some((child) =>
    blockProvidesDimensionAnchorCore(child, axis, getChildBlocks)
  );
}

function flatTemplateChildBlocks(template: EmailTemplate): ChildBlocksAccessor {
  return (block) =>
    (block.children ?? [])
      .map((childId) => template.blocks[childId])
      .filter((child): child is EmailBlock => Boolean(child));
}

function nestedTreeChildBlocks(): ChildBlocksAccessor {
  return (block) =>
    (block.children ?? []).filter(
      (child): child is EmailBlock =>
        typeof child === "object" && child !== null && "type" in child
    );
}

/**
 * 子树是否在指定轴提供尺寸锚点（供父级 hug 解析）。
 */
export function blockProvidesDimensionAnchor(
  template: EmailTemplate,
  blockId: string,
  axis: WrapperFillAxis
): boolean {
  const block = template.blocks[blockId];
  if (!block) return false;
  return blockProvidesDimensionAnchorCore(block, axis, flatTemplateChildBlocks(template));
}

/** 嵌套树节点（autofix 级联）上的尺寸锚点判定。 */
export function blockNodeProvidesDimensionAnchor(
  block: EmailBlock,
  axis: WrapperFillAxis
): boolean {
  return blockProvidesDimensionAnchorCore(block, axis, nestedTreeChildBlocks());
}

/** 同级兄弟中是否存在指定轴尺寸锚点（不含自身）。 */
export function hasSiblingDimensionAnchor(
  template: EmailTemplate,
  childBlockId: string,
  axis: WrapperFillAxis
): boolean {
  const child = template.blocks[childBlockId];
  if (!child?.parentId) return false;
  const parent = template.blocks[child.parentId];
  if (!parent) return false;
  const getChildren = flatTemplateChildBlocks(template);
  return getChildren(parent).some(
    (sibling) =>
      sibling.id !== childBlockId &&
      blockProvidesDimensionAnchorCore(sibling, axis, getChildren)
  );
}

/** 嵌套树：同级兄弟是否存在指定轴尺寸锚点。 */
export function hasSiblingDimensionAnchorInNestedTree(
  parent: EmailBlock,
  childId: string,
  axis: WrapperFillAxis
): boolean {
  const getChildren = nestedTreeChildBlocks();
  return getChildren(parent).some(
    (sibling) =>
      sibling.id !== childId && blockProvidesDimensionAnchorCore(sibling, axis, getChildren)
  );
}

/** 父容器在指定轴是否缺少子级锚点。`blockEmptyChildren` 为 true 时空子级也视为无锚点（Inspector 置灰）。 */
export function isContainerHugBlockedByMissingChildAnchor(
  template: EmailTemplate,
  blockId: string,
  axis: WrapperFillAxis,
  block?: EmailBlock,
  opts?: { blockEmptyChildren?: boolean }
): boolean {
  const target = block ?? template.blocks[blockId];
  if (!target || !isHugConstraintContainer(target)) {
    return false;
  }
  const children = target.children ?? [];
  if (children.length === 0) {
    return opts?.blockEmptyChildren ?? false;
  }

  if (target.type === "grid") {
    const props = target.props;
    if (
      axis === "height" &&
      props?.cellHeightMode === "fixed" &&
      isNonemptyFixedDimension(props?.cellHeight)
    ) {
      return false;
    }
    if (
      axis === "width" &&
      props?.cellWidthMode === "fixed" &&
      isNonemptyFixedDimension(props?.cellWidth)
    ) {
      return false;
    }
  }

  return !children.some((childId) => blockProvidesDimensionAnchor(template, childId, axis));
}

export function getHugValidationReason(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "layout/grid/image/emailRoot 宽度模式为 hug 时，须至少一个子级提供宽度锚点（fixed 或 text/icon/button 等 hug 内容）；请改为 fill 或 fixed，或调整子级尺寸"
    : "layout/grid/image/emailRoot 高度模式为 hug 时，须至少一个子级提供高度锚点（fixed 或 text/icon/button 等 hug 内容）；请改为 fill 或 fixed，或调整子级尺寸";
}

export function getHugOptionTitle(axis: WrapperFillAxis): string {
  return axis === "width" ? "子级无宽度锚点时不可用" : "子级无高度锚点时不可用";
}

export function getContainerHugModeHint(axis: WrapperFillAxis): string {
  return axis === "width"
    ? "子级无宽度锚点（fixed 或带固有宽度的 hug 内容）时，容器宽度跟随内容（hug）会形成循环依赖，已禁用。"
    : "子级无高度锚点时，容器高度跟随内容（hug）会形成循环依赖，已禁用。";
}

/** Inspector 字段 hint：合并 fill-under-hug 与 hug-without-anchor 两类禁用原因。 */
export function getWrapperDimensionModeHint(
  axis: WrapperFillAxis,
  opts: { fillBlocked: boolean; hugBlocked: boolean }
): string {
  if (opts.fillBlocked && opts.hugBlocked) {
    return `${getContainerHugModeHint(axis)} ${getWrapperModeHint(axis, true)}`;
  }
  if (opts.hugBlocked) {
    return getContainerHugModeHint(axis);
  }
  return getWrapperModeHint(axis, opts.fillBlocked);
}

const CONTAINER_HUG_FALLBACK = "fill" as const;

/** 容器 hug 无子级锚点时回落 fill（协调层 / 迁移共用）。 */
export function normalizeContainerHugDimensionModes(
  template: EmailTemplate,
  blockId: string,
  block?: EmailBlock
): {
  wrapperStyle: WrapperStyle | undefined;
  changed: boolean;
  changes: ContainerHugDimensionModeChange[];
} {
  const target = block ?? template.blocks[blockId];
  if (!target || !isHugConstraintContainer(target)) {
    return { wrapperStyle: target?.wrapperStyle, changed: false, changes: [] };
  }
  const ws = target.wrapperStyle;
  if (!ws) {
    return { wrapperStyle: ws, changed: false, changes: [] };
  }

  const changes: ContainerHugDimensionModeChange[] = [];
  let nextWs = ws;

  if (
    ws.widthMode === "hug" &&
    isContainerHugBlockedByMissingChildAnchor(template, blockId, "width", target)
  ) {
    changes.push({ blockId, axis: "width", from: "hug", to: CONTAINER_HUG_FALLBACK });
    nextWs = { ...nextWs, widthMode: CONTAINER_HUG_FALLBACK };
  }
  if (
    ws.heightMode === "hug" &&
    isContainerHugBlockedByMissingChildAnchor(template, blockId, "height", target)
  ) {
    changes.push({ blockId, axis: "height", from: "hug", to: CONTAINER_HUG_FALLBACK });
    nextWs = { ...nextWs, heightMode: CONTAINER_HUG_FALLBACK };
  }

  if (changes.length === 0) {
    return { wrapperStyle: ws, changed: false, changes: [] };
  }
  return { wrapperStyle: nextWs, changed: true, changes };
}
