import { DEFAULT_CONTENT_ALIGN } from "./buildPrimitives";
import { mapImageOverlayAlign, mapStackAlign } from "./resolveValue";
import type { AlignCross } from "./types";

export type StackTextParentContext = {
  inDirectStack?: boolean;
  stackAlign?: AlignCross;
};

export type ImageOverlayTextParentContext = {
  inDirectImageOverlay?: boolean;
  imageOverlayAlign?: AlignCross;
  imageOverlayCrossAlign?: AlignCross;
};

export type TextContentAlignParent = StackTextParentContext & ImageOverlayTextParentContext;

/** stack 直接子块的 horizontal align；非 stack 子级回退 center。 */
export function resolveStackChildHorizontalAlign(parent: StackTextParentContext): {
  horizontal: "left" | "center" | "right";
} {
  if (!parent.inDirectStack) {
    return { horizontal: DEFAULT_CONTENT_ALIGN.horizontal };
  }
  return { horizontal: mapStackAlign(parent.stackAlign).horizontal };
}

/** text 块 contentAlign：节点 `align` 优先；否则继承 stack / image 叠放。 */
export function resolveTextContentAlign(
  parent: TextContentAlignParent,
  textAlign?: AlignCross
): {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
} {
  if (textAlign !== undefined) {
    return {
      horizontal: mapStackAlign(textAlign).horizontal,
      vertical: DEFAULT_CONTENT_ALIGN.vertical,
    };
  }
  if (parent.inDirectImageOverlay) {
    const mapped = mapImageOverlayAlign(parent.imageOverlayAlign, parent.imageOverlayCrossAlign);
    return {
      horizontal: mapped.horizontal,
      vertical: mapped.vertical,
    };
  }
  const { horizontal } = resolveStackChildHorizontalAlign(parent);
  return {
    horizontal,
    vertical: DEFAULT_CONTENT_ALIGN.vertical,
  };
}

/** button 外层 wrapper contentAlign：stack / image 叠放直接子级继承 horizontal。 */
export function resolveButtonWrapperContentAlign(parent: TextContentAlignParent): {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
} {
  if (parent.inDirectImageOverlay) {
    const mapped = mapImageOverlayAlign(parent.imageOverlayAlign, parent.imageOverlayCrossAlign);
    return { horizontal: mapped.horizontal, vertical: "center" };
  }
  const { horizontal } = resolveStackChildHorizontalAlign(parent);
  return { horizontal, vertical: "center" };
}
