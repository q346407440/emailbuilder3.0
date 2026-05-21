export type VerticalDirection = "top" | "bottom";
export type HorizontalAlignment = "left" | "right";
export type FloatingPlacement =
  | "top"
  | "bottom"
  | "topLeft"
  | "topRight"
  | "topCenter"
  | "bottomLeft"
  | "bottomRight"
  | "bottomCenter";

export type ResolveVerticalDirectionParams = {
  spaceAbove: number;
  spaceBelow: number;
  popupHeight: number;
  preferredDirection?: VerticalDirection;
  minViewportPadding?: number;
};

export type ResolveHorizontalAlignmentParams = {
  spaceLeft: number;
  spaceRight: number;
  popupWidth: number;
  preferredAlignment?: HorizontalAlignment;
  minViewportPadding?: number;
};

/**
 * 根据可视区空间决定浮层向上/向下展开方向。
 * 规则：
 * 1) 优先使用首选方向（默认 top），前提是空间足够；
 * 2) 首选方向不够时，若另一方向足够，则切换；
 * 3) 两边都不够时，选择可用空间更大的一侧。
 */
export function resolveVerticalDirection({
  spaceAbove,
  spaceBelow,
  popupHeight,
  preferredDirection = "top",
  minViewportPadding = 8,
}: ResolveVerticalDirectionParams): VerticalDirection {
  const needed = Math.max(0, popupHeight) + minViewportPadding;
  const preferredSpace = preferredDirection === "top" ? spaceAbove : spaceBelow;
  const fallbackDirection: VerticalDirection = preferredDirection === "top" ? "bottom" : "top";
  const fallbackSpace = fallbackDirection === "top" ? spaceAbove : spaceBelow;

  if (preferredSpace >= needed) {
    return preferredDirection;
  }
  if (fallbackSpace >= needed) {
    return fallbackDirection;
  }
  return spaceAbove >= spaceBelow ? "top" : "bottom";
}

/**
 * 将 top 或 bottom 开头的 placement 映射到目标纵向方向。
 * 例如：topLeft -> bottomLeft，bottomRight -> topRight。
 */
export function mapPlacementDirection(
  placement: FloatingPlacement,
  direction: VerticalDirection
): FloatingPlacement {
  if (placement.startsWith("top")) {
    return placement.replace(/^top/, direction) as FloatingPlacement;
  }
  if (placement.startsWith("bottom")) {
    return placement.replace(/^bottom/, direction) as FloatingPlacement;
  }
  return direction === "top" ? "top" : "bottom";
}

/**
 * 根据可视区左右空间决定浮层水平对齐：
 * - left: 浮层左边贴触发器左边（向右展开）
 * - right: 浮层右边贴触发器右边（向左展开）
 */
export function resolveHorizontalAlignment({
  spaceLeft,
  spaceRight,
  popupWidth,
  preferredAlignment = "left",
  minViewportPadding = 8,
}: ResolveHorizontalAlignmentParams): HorizontalAlignment {
  const needed = Math.max(0, popupWidth) + minViewportPadding;
  const preferredSpace = preferredAlignment === "left" ? spaceRight : spaceLeft;
  const fallbackAlignment: HorizontalAlignment = preferredAlignment === "left" ? "right" : "left";
  const fallbackSpace = fallbackAlignment === "left" ? spaceRight : spaceLeft;

  if (preferredSpace >= needed) {
    return preferredAlignment;
  }
  if (fallbackSpace >= needed) {
    return fallbackAlignment;
  }
  return spaceRight >= spaceLeft ? "left" : "right";
}

/** 将 placement 的 Left/Right 后缀映射到目标水平对齐。 */
export function mapPlacementAlignment(
  placement: FloatingPlacement,
  alignment: HorizontalAlignment
): FloatingPlacement {
  if (placement.endsWith("Left")) {
    return alignment === "left"
      ? placement
      : (placement.replace(/Left$/, "Right") as FloatingPlacement);
  }
  if (placement.endsWith("Right")) {
    return alignment === "right"
      ? placement
      : (placement.replace(/Right$/, "Left") as FloatingPlacement);
  }
  return placement;
}
