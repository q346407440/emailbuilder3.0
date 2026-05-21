import type { CSSProperties } from "react";

const VIEW_MARGIN = 8;
const POPOVER_GAP = 6;
/** 首帧 offsetHeight 为 0 时的估算高度，用于先决定向上/向下展开 */
const MIN_PLACEHOLDER_HEIGHT = 168;

/**
 * 将来源菜单定位在视口内：优先向下，空间不足则向上；水平与触发按钮右对齐并夹紧视口。
 */
export function computeInspectorFieldSourcePopoverStyle(
  triggerRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number
): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ph = Math.max(popoverHeight, MIN_PLACEHOLDER_HEIGHT);

  const spaceBelow = vh - triggerRect.bottom - VIEW_MARGIN;
  const spaceAbove = triggerRect.top - VIEW_MARGIN;
  const preferBelow = spaceBelow >= ph + POPOVER_GAP || spaceBelow >= spaceAbove;

  let top: number;
  let maxHeight: number;

  if (preferBelow) {
    top = triggerRect.bottom + POPOVER_GAP;
    maxHeight = Math.max(120, vh - VIEW_MARGIN - top);
  } else {
    maxHeight = Math.max(120, triggerRect.top - VIEW_MARGIN - POPOVER_GAP);
    const idealTop = triggerRect.top - Math.min(ph, maxHeight) - POPOVER_GAP;
    top = Math.max(VIEW_MARGIN, idealTop);
  }

  let left = triggerRect.right - popoverWidth;
  left = Math.max(VIEW_MARGIN, Math.min(left, vw - popoverWidth - VIEW_MARGIN));

  const overflowY = maxHeight < popoverHeight - 1 ? "auto" : undefined;

  return {
    position: "fixed",
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(popoverWidth)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    overflowY,
    /** 高于 ColorPicker 下拉（10050），避免叠在同一层时抢不到点击 */
    zIndex: 10100,
  };
}
