import type { CanvasPreviewViewportMode } from "./types";
import { EMAIL_ROOT_FIXED_WIDTH } from "../render-defaults-contract/values";
import { parseCssPx } from "../lib/canvasDimensionResolve";

/**
 * 编辑器画布 chrome 常量（唯一真源）。
 * 与 `render-defaults-contract`（模板预览渲染默认）分工：本包只管工作台 `.canvas-scroll` 等行为。
 */
export const EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT = false as const;

/** 画布滚动区横向溢出：禁止拖动画布（宽模板在可视区内裁切，不产横向滚动条） */
export const EMAIL_CANVAS_SCROLL_OVERFLOW_X = "hidden" as const;

/** 画布滚动区纵向：长邮件仍允许用户手动上下滚动画布 */
export const EMAIL_CANVAS_SCROLL_OVERFLOW_Y = "auto" as const;

/**
 * 画布左右操作钮距预览水平锚点左右外缘的间距。
 * 桌面：锚点为 emailRoot（`data-email-preview-block` = rootBlockId）；
 * 移动（视窗窄于版心）：锚点为 `.email-preview-viewport` 可见区域。
 */
export const EMAIL_CANVAS_BLOCK_ACTION_INSET_X = 20 as const;

/** 左侧操作钮列宽度，与 `.canvas-block-actions__insert` 一致。 */
export const EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH = 104 as const;

/** 画布操作钮估算高度（antd 次级按钮 + 边框），用于顶/底对齐判定（首帧定稿，避免二次校正抖动）。 */
export const EMAIL_CANVAS_BLOCK_ACTION_BUTTON_HEIGHT = 28 as const;

/** 画布操作钮列纵向间距，与 `.canvas-block-actions__insert` 的 gap 一致。 */
export const EMAIL_CANVAS_BLOCK_ACTION_BUTTON_GAP = 8 as const;

/** 操作浮层距 stage 上下边缘的最小留白。 */
export const EMAIL_CANVAS_BLOCK_ACTION_EDGE_PADDING = 8 as const;

/** 画布块操作浮层 z-index：须高于预览选中描边等画布内叠层。 */
export const EMAIL_CANVAS_BLOCK_ACTION_Z_INDEX = 100 as const;

/** 桌面预览视窗宽：与版心配置宽同源 */
export const EMAIL_CANVAS_VIEWPORT_DESKTOP_PX =
  parseCssPx(EMAIL_ROOT_FIXED_WIDTH) ?? 600;

/** 移动预览视窗宽（常见手机逻辑宽；仅预览 UI 态） */
export const EMAIL_CANVAS_VIEWPORT_MOBILE_PX = 375 as const;

/** 预览视窗模式 → 像素宽（不写 template.json） */
export function resolveCanvasPreviewViewportWidth(mode: CanvasPreviewViewportMode): number {
  return mode === "mobile" ? EMAIL_CANVAS_VIEWPORT_MOBILE_PX : EMAIL_CANVAS_VIEWPORT_DESKTOP_PX;
}

export const EDITOR_CANVAS_VALUES = {
  EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT,
  EMAIL_CANVAS_SCROLL_OVERFLOW_X,
  EMAIL_CANVAS_SCROLL_OVERFLOW_Y,
  EMAIL_CANVAS_BLOCK_ACTION_INSET_X,
  EMAIL_CANVAS_BLOCK_ACTION_INSERT_COLUMN_WIDTH,
  EMAIL_CANVAS_BLOCK_ACTION_Z_INDEX,
  EMAIL_CANVAS_VIEWPORT_DESKTOP_PX,
  EMAIL_CANVAS_VIEWPORT_MOBILE_PX,
} as const;
