import {
  EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP,
  EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT,
  EMAIL_CANVAS_BLOCK_ACTION_EDGE_PADDING,
  EMAIL_CANVAS_BLOCK_ACTION_INSET_X,
  EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH,
} from "../editor-canvas-contract/values";
import { isPreviewViewportNarrowerThanRoot } from "./canvasDimensionResolve";

export type CanvasBlockActionVerticalAlign = "top" | "bottom";

export type CanvasBlockActionColumnLayout = {
  top: number;
  verticalAlign: CanvasBlockActionVerticalAlign;
};

export type CanvasBlockActionLayout = {
  insert: CanvasBlockActionColumnLayout;
  delete: CanvasBlockActionColumnLayout;
  /** 左侧按钮列 left（`position: fixed` 视口坐标） */
  insertLeft: number;
  /** 右侧删除钮 left（`position: fixed` 视口坐标） */
  deleteLeft: number;
};

export function escapePreviewBlockIdForSelector(blockId: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(blockId)
    : blockId.replace(/"/g, '\\"');
}

/** 估算操作钮列总高度（按钮数 × 高度 + 间距）。 */
export function estimateCanvasBlockActionColumnHeight(
  buttonCount: number,
  options?: {
    buttonHeight?: number;
    gap?: number;
  }
): number {
  if (buttonCount <= 0) return 0;
  const buttonHeight = options?.buttonHeight ?? EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT;
  const gap = options?.gap ?? EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP;
  return buttonCount * buttonHeight + (buttonCount - 1) * gap;
}

/** 左侧可见操作钮数量（与 App 画布操作列渲染条件一致）。 */
export function countCanvasLeftActionButtons(args: {
  canDragMove: boolean;
  siblingMoveEnabled: boolean;
  canDuplicate: boolean;
  supportsChildInsert: boolean;
  supportsBelowInsert: boolean;
  canSaveAsSection: boolean;
}): number {
  let count = 0;
  if (args.canDragMove) count += 1;
  if (args.siblingMoveEnabled) count += 2;
  if (args.canDuplicate) count += 1;
  if (args.supportsChildInsert) count += 1;
  if (args.supportsBelowInsert) count += 1;
  if (args.canSaveAsSection) count += 1;
  return count;
}

/**
 * 操作列垂直定位：仅两种模式。
 * - top：列顶与块顶对齐（下方空间足够时）
 * - bottom：列底与块底对齐（顶对齐会超出 stage 底边时）
 */
export function resolveCanvasBlockActionVerticalLayout(args: {
  blockTopInStage: number;
  blockBottomInStage: number;
  stageHeight: number;
  maxColumnHeight: number;
  edgePadding?: number;
}): { top: number; verticalAlign: CanvasBlockActionVerticalAlign } {
  const edgePadding = args.edgePadding ?? EMAIL_CANVAS_BLOCK_ACTION_EDGE_PADDING;
  const blockTop = args.blockTopInStage;
  const blockBottom = args.blockBottomInStage;

  if (args.maxColumnHeight <= 0) {
    return { top: blockTop, verticalAlign: "top" };
  }

  const topAlignBottom = blockTop + args.maxColumnHeight;
  const fitsTopAlign = topAlignBottom <= args.stageHeight - edgePadding;
  if (fitsTopAlign) {
    return { top: blockTop, verticalAlign: "top" };
  }

  const bottomAlignTop = blockBottom - args.maxColumnHeight;
  return {
    top: Math.max(edgePadding, bottomAlignTop),
    verticalAlign: "bottom",
  };
}

/**
 * 画布块操作左右水平锚点：桌面与版心同宽时用 emailRoot 外缘；
 * 移动预览（视窗窄于版心）时用 `.email-preview-viewport` 可见区域，与根选中描边一致。
 */
export function pickCanvasBlockActionHorizontalAnchorRect(args: {
  previewViewportPx: number;
  rootConfiguredWidthPx: number;
  previewRootRect: DOMRectReadOnly;
  previewViewportRect: DOMRectReadOnly | null;
}): DOMRectReadOnly {
  if (
    isPreviewViewportNarrowerThanRoot(args.previewViewportPx, args.rootConfiguredWidthPx) &&
    args.previewViewportRect
  ) {
    return args.previewViewportRect;
  }
  return args.previewRootRect;
}

export function computeCanvasBlockActionLayout(args: {
  stageRect: DOMRectReadOnly;
  horizontalAnchorRect: DOMRectReadOnly;
  selectedBlockRect: DOMRectReadOnly;
  insetX?: number;
  insertColumnWidth?: number;
  /** 左侧操作钮数量（用于估算列高，首帧即定稿避免抖动） */
  insertButtonCount?: number;
  /** 右侧删除钮数量（0 或 1） */
  deleteButtonCount?: number;
  edgePadding?: number;
}): CanvasBlockActionLayout {
  const insetX = args.insetX ?? EMAIL_CANVAS_BLOCK_ACTION_INSET_X;
  const insertColumnWidth =
    args.insertColumnWidth ?? EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH;
  const blockTopInStage = args.selectedBlockRect.top - args.stageRect.top;
  const blockBottomInStage = args.selectedBlockRect.bottom - args.stageRect.top;
  const stageHeight = args.stageRect.height;
  const insertHeight = estimateCanvasBlockActionColumnHeight(args.insertButtonCount ?? 0);
  const deleteHeight = estimateCanvasBlockActionColumnHeight(args.deleteButtonCount ?? 0);
  const shared = {
    blockTopInStage,
    blockBottomInStage,
    stageHeight,
    edgePadding: args.edgePadding,
  };
  const insert = resolveCanvasBlockActionVerticalLayout({
    ...shared,
    maxColumnHeight: insertHeight,
  });
  const del = resolveCanvasBlockActionVerticalLayout({
    ...shared,
    maxColumnHeight: deleteHeight,
  });
  const stageTop = args.stageRect.top;
  return {
    insert: {
      top: stageTop + insert.top,
      verticalAlign: insert.verticalAlign,
    },
    delete: {
      top: stageTop + del.top,
      verticalAlign: del.verticalAlign,
    },
    insertLeft: args.horizontalAnchorRect.left - insetX - insertColumnWidth,
    deleteLeft: args.horizontalAnchorRect.right + insetX,
  };
}
