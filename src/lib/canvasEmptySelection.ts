/** 画布预览中可命中区块的 DOM 标记（与 `canvasPreviewBlockDataProps` 一致） */
export const EMAIL_PREVIEW_BLOCK_SELECTOR = "[data-email-preview-block]";

/**
 * 判断点击是否落在画布非区块区域（灰底、滚动区内留白等）。
 * 区块自身点击由各自 handler 处理并 stopPropagation。
 */
export function isCanvasNonBlockClickTarget(target: EventTarget | null): boolean {
  const el =
    target instanceof Element
      ? target
      : target instanceof Text
        ? target.parentElement
        : null;
  if (!el) return false;
  if (el.closest(EMAIL_PREVIEW_BLOCK_SELECTOR)) return false;
  if (el.closest(".canvas-block-actions")) return false;
  return (
    el.closest(".email-preview-canvas-workspace") !== null ||
    el.closest(".canvas-scroll") !== null
  );
}
