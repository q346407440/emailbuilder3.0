import { DEFAULT_CONTENT_ALIGN } from "./buildPrimitives";
import { mapImageOverlayAlign, mapRowAlign, mapStackAlign } from "./resolveValue";
import type { AlignCross, AlignMain } from "./types";

export type StackTextParentContext = {
  inDirectStack?: boolean;
  stackAlign?: AlignCross;
};

export type RowTextParentContext = {
  inDirectRow?: boolean;
  rowAlign?: AlignMain;
};

export type ImageOverlayTextParentContext = {
  inDirectImageOverlay?: boolean;
  imageOverlayAlign?: AlignCross;
  imageOverlayCrossAlign?: AlignCross;
};

export type TextContentAlignParent = StackTextParentContext &
  RowTextParentContext &
  ImageOverlayTextParentContext;

/** stack 直接子块的 horizontal align；无 stack 上下文时不在此处理。 */
export function resolveStackChildHorizontalAlign(parent: StackTextParentContext): {
  horizontal: "left" | "center" | "right";
} {
  if (!parent.inDirectStack) {
    return { horizontal: DEFAULT_CONTENT_ALIGN.horizontal };
  }
  return { horizontal: mapStackAlign(parent.stackAlign).horizontal };
}

/** row 直接子块的 horizontal align；无 row 上下文时不在此处理。 */
export function resolveRowChildHorizontalAlign(parent: RowTextParentContext): {
  horizontal: "left" | "center" | "right";
} {
  if (!parent.inDirectRow || parent.rowAlign === undefined) {
    return { horizontal: DEFAULT_CONTENT_ALIGN.horizontal };
  }
  return { horizontal: mapRowAlign(parent.rowAlign).horizontal };
}

/** text 块 contentAlign：节点 `align` 优先；否则继承 stack / row / image 叠放。 */
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
  if (parent.inDirectStack) {
    const { horizontal } = resolveStackChildHorizontalAlign(parent);
    return {
      horizontal,
      vertical: DEFAULT_CONTENT_ALIGN.vertical,
    };
  }
  if (parent.inDirectRow) {
    const { horizontal } = resolveRowChildHorizontalAlign(parent);
    return {
      horizontal,
      vertical: DEFAULT_CONTENT_ALIGN.vertical,
    };
  }
  return {
    horizontal: DEFAULT_CONTENT_ALIGN.horizontal,
    vertical: DEFAULT_CONTENT_ALIGN.vertical,
  };
}

/** button 外层 wrapper contentAlign：stack / row / image 叠放直接子级继承 horizontal。 */
export function resolveButtonWrapperContentAlign(parent: TextContentAlignParent): {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
} {
  if (parent.inDirectImageOverlay) {
    const mapped = mapImageOverlayAlign(parent.imageOverlayAlign, parent.imageOverlayCrossAlign);
    return { horizontal: mapped.horizontal, vertical: "center" };
  }
  if (parent.inDirectStack) {
    const { horizontal } = resolveStackChildHorizontalAlign(parent);
    return { horizontal, vertical: "center" };
  }
  if (parent.inDirectRow) {
    const { horizontal } = resolveRowChildHorizontalAlign(parent);
    return { horizontal, vertical: "center" };
  }
  return {
    horizontal: DEFAULT_CONTENT_ALIGN.horizontal,
    vertical: "center",
  };
}
