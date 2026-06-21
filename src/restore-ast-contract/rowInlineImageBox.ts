import type { AspectRatio } from "./types";

/** row 内 image fixed 宽下限（px）；过窄时抬到可点选尺寸。 */
export const ROW_INLINE_IMAGE_WIDTH_MIN = 72;

/** row 内漏写 aspect 时的兜底比例（竖图 3:4）。 */
export const ROW_INLINE_IMAGE_DEFAULT_ASPECT: AspectRatio = { w: 3, h: 4 };

function normalizeAspect(aspect: AspectRatio | undefined): AspectRatio {
  const w = aspect?.w;
  const h = aspect?.h;
  if (typeof w === "number" && w > 0 && typeof h === "number" && h > 0) {
    return { w, h };
  }
  return ROW_INLINE_IMAGE_DEFAULT_ASPECT;
}

/**
 * 横排 row 内联 image 盒尺寸：宽 = 高 × (w/h)，仅保留下限。
 * `aspect` 来自 AST；缺省或非法时兜底 3:4。
 */
export function deriveRowInlineImageBox(
  heightPxInput: number,
  aspect?: AspectRatio
): { widthPx: number; heightPx: number } {
  const heightPx = Math.max(1, Math.round(heightPxInput));
  const { w, h } = normalizeAspect(aspect);
  const rawWidth = Math.round(heightPx * (w / h));
  const widthPx = Math.max(ROW_INLINE_IMAGE_WIDTH_MIN, rawWidth);
  return { widthPx, heightPx };
}
