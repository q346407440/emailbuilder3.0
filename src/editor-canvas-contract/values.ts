/**
 * 编辑器画布 chrome 常量（唯一真源）。
 * 与 `render-defaults-contract`（模板预览渲染默认）分工：本包只管工作台 `.canvas-scroll` 等行为。
 */
export const EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT = false as const;

/** 画布滚动区横向溢出：禁止拖动画布（宽模板在可视区内裁切，不产横向滚动条） */
export const EMAIL_CANVAS_SCROLL_OVERFLOW_X = "hidden" as const;

/** 画布滚动区纵向：长邮件仍允许用户手动上下滚动画布 */
export const EMAIL_CANVAS_SCROLL_OVERFLOW_Y = "auto" as const;

/** 画布左右操作钮距邮件预览根（`data-email-preview-block` = rootBlockId）左右外缘的间距。 */
export const EMAIL_CANVAS_BLOCK_ACTION_INSET_X = 20 as const;

/** 左侧操作钮列宽度，与 `.canvas-block-actions__insert` 一致。 */
export const EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH = 104 as const;

/** 画布块操作浮层 z-index：须高于预览选中描边等画布内叠层。 */
export const EMAIL_CANVAS_BLOCK_ACTION_Z_INDEX = 100 as const;

export const EDITOR_CANVAS_VALUES = {
  EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT,
  EMAIL_CANVAS_SCROLL_OVERFLOW_X,
  EMAIL_CANVAS_SCROLL_OVERFLOW_Y,
  EMAIL_CANVAS_BLOCK_ACTION_INSET_X,
  EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH,
  EMAIL_CANVAS_BLOCK_ACTION_Z_INDEX,
} as const;
