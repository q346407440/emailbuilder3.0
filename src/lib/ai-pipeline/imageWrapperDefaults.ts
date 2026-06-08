import type { CompactWrapper } from "./types";

/** 栅格单元格上下文：D 阶段传给图片 preset；定高时才用 cellHeight。 */
export type ImageWrapperGridContext = {
  cellHeightMode: "fixed" | "content-max";
  cellHeight?: string;
};

const MIN_IMAGE_HEIGHT_PX = 32;
const MAX_IMAGE_HEIGHT_PX = 480;
const MIN_IMAGE_WIDTH_PX = 40;
const MAX_IMAGE_WIDTH_PX = 600;

const DEFAULT_IMAGE_HEIGHT = "280px";

function parsePx(value: string | undefined): number | null {
  if (!value || typeof value !== "string") return null;
  const m = /^(\d+(?:\.\d+)?)\s*px$/i.exec(value.trim());
  return m ? Number(m[1]) : null;
}

function clampPxString(value: string | undefined, min: number, max: number): string | undefined {
  if (!value) return value;
  const n = parsePx(value);
  if (n == null) return value;
  return `${Math.min(max, Math.max(min, Math.round(n)))}px`;
}

/** content.image 容器缺省与 clamp（C 优先，程序兜底；不用素材文件像素定盒）。 */
export function applyImageWrapperDefaults(
  wrapper: CompactWrapper | undefined,
  gridCtx?: ImageWrapperGridContext
): CompactWrapper {
  const next: CompactWrapper = { ...(wrapper ?? {}) };

  next.widthMode = next.widthMode ?? "fill";
  next.heightMode = next.heightMode ?? "fixed";

  if (
    gridCtx?.cellHeightMode === "fixed" &&
    gridCtx.cellHeight?.trim() &&
    next.heightMode === "fill"
  ) {
    next.heightMode = "fixed";
    if (!next.height) {
      next.height = gridCtx.cellHeight.trim();
    }
  }

  if (next.heightMode === "fixed" && !next.height) {
    next.height = DEFAULT_IMAGE_HEIGHT;
  }

  if (next.width) next.width = clampPxString(next.width, MIN_IMAGE_WIDTH_PX, MAX_IMAGE_WIDTH_PX);
  if (next.height) next.height = clampPxString(next.height, MIN_IMAGE_HEIGHT_PX, MAX_IMAGE_HEIGHT_PX);

  return next;
}
