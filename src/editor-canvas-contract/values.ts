/**
 * 编辑器画布 chrome 常量（唯一真源）。
 * 与 `render-defaults-contract`（模板预览渲染默认）分工：本包只管工作台 `.canvas-scroll` 等行为。
 */
export const EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT = false as const;

/** 画布滚动区横向溢出：禁止拖动画布（宽模板在可视区内裁切，不产横向滚动条） */
export const EMAIL_CANVAS_SCROLL_OVERFLOW_X = "hidden" as const;

/** 画布滚动区纵向：长邮件仍允许用户手动上下滚动画布 */
export const EMAIL_CANVAS_SCROLL_OVERFLOW_Y = "auto" as const;

export const EDITOR_CANVAS_VALUES = {
  EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT,
  EMAIL_CANVAS_SCROLL_OVERFLOW_X,
  EMAIL_CANVAS_SCROLL_OVERFLOW_Y,
} as const;
