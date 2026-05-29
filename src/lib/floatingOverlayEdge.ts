export type VerticalDirection = "top" | "bottom";
export type HorizontalAlignment = "left" | "right";
export type FloatingOverlayEdge =
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

/** 将 top/bottom 前缀的浮层锚点映射到目标纵向方向。 */
export function mapOverlayEdgeDirection(
  edge: FloatingOverlayEdge,
  direction: VerticalDirection
): FloatingOverlayEdge {
  if (edge.startsWith("top")) {
    return edge.replace(/^top/, direction) as FloatingOverlayEdge;
  }
  if (edge.startsWith("bottom")) {
    return edge.replace(/^bottom/, direction) as FloatingOverlayEdge;
  }
  return direction === "top" ? "top" : "bottom";
}

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

/** 将 Left/Right 后缀映射到目标水平对齐。 */
export function mapOverlayEdgeAlignment(
  edge: FloatingOverlayEdge,
  alignment: HorizontalAlignment
): FloatingOverlayEdge {
  if (edge.endsWith("Left")) {
    return alignment === "left"
      ? edge
      : (edge.replace(/Left$/, "Right") as FloatingOverlayEdge);
  }
  if (edge.endsWith("Right")) {
    return alignment === "right"
      ? edge
      : (edge.replace(/Right$/, "Left") as FloatingOverlayEdge);
  }
  return edge;
}
