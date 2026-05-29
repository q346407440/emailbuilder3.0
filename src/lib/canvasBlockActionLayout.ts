import {
  EMAIL_CANVAS_BLOCK_ACTION_INSET_X,
  EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH,
} from "../editor-canvas-contract/values";

export type CanvasBlockActionLayout = {
  /** 首个操作钮顶部，与选中块顶边对齐（相对 canvas-col__stage） */
  top: number;
  /** 左侧按钮列 left（相对 stage） */
  insertLeft: number;
  /** 右侧删除钮 left（相对 stage） */
  deleteLeft: number;
};

export function escapePreviewBlockIdForSelector(blockId: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(blockId)
    : blockId.replace(/"/g, '\\"');
}

export function computeCanvasBlockActionLayout(args: {
  stageRect: DOMRectReadOnly;
  previewRootRect: DOMRectReadOnly;
  selectedBlockRect: DOMRectReadOnly;
  insetX?: number;
  insertColumnWidth?: number;
}): CanvasBlockActionLayout {
  const insetX = args.insetX ?? EMAIL_CANVAS_BLOCK_ACTION_INSET_X;
  const insertColumnWidth =
    args.insertColumnWidth ?? EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH;
  const top = args.selectedBlockRect.top - args.stageRect.top;
  const rootLeftInStage = args.previewRootRect.left - args.stageRect.left;
  const rootRightInStage = args.previewRootRect.right - args.stageRect.left;
  return {
    top,
    insertLeft: rootLeftInStage - insetX - insertColumnWidth,
    deleteLeft: rootRightInStage + insetX,
  };
}
