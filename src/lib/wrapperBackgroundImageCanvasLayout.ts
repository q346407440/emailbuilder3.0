import type { CSSProperties } from "react";
import { IMAGE_BACKGROUND_FALLBACK_COLOR, WRAPPER_BACKGROUND_IMAGE_DEFAULT_ALT, projectLayoutContentAlign } from "../render-defaults-contract/values";
import type { WrapperContentAlign, WrapperStyle } from "../types/email";
import { overlayCellAlignFromLayoutContentAlign, type TableCellVerticalAlign } from "./emailTableLayout";
import { normalizeCssLengthPx } from "./wrapperBackgroundImage";
import type { WrapperBackgroundImagePresentationFields } from "./wrapperBackgroundImagePresentation";
import { borderRadiusToCss, paddingToCss, wrapperStyleToCss } from "./wrapperStyleToCss";

/** layout / grid / image / emailRoot 底图叠放画布：布局派生真源（padding 语义、td 对齐、外层盒模型）。 */
export type WrapperBackgroundImageCanvasLayout = {
  src: string;
  link: string | undefined;
  altText: string;
  fixedCanvasHeight: string | undefined;
  wrapperBackgroundColor: string;
  overlayBorderCss: CSSProperties;
  overlayRadiusCss: CSSProperties;
  overlayPaddingCss: string | undefined;
  overlayHorizontalAlign: "left" | "center" | "right";
  overlayVerticalValign: TableCellVerticalAlign;
  outerBoxCss: CSSProperties;
  bgPresentationFields: WrapperBackgroundImagePresentationFields;
  /** 底图承载 table 的 border-collapse */
  bgTableBorderCollapse: "collapse" | "separate";
  /** 定高画布为 true：table 不写死 height，仅 td 定高，避免与 outer 盒双计高度后 overflow 裁切 */
  bgTableHeightFromTd: boolean;
  /** heightMode=fill：内层 table/td 用 100% 撑满外层定高槽位（grid 单元格、layout fill 子级等） */
  fillStretchHeight: boolean;
  enableHugIntrinsicHeight: boolean;
};

export type ResolveWrapperBackgroundImageCanvasLayoutInput = {
  wrapperStyle: WrapperStyle | undefined;
  /** layout 排列方向；grid 等无 direction 块省略或传 vertical */
  layoutDirection?: "vertical" | "horizontal";
  /** 覆盖 wrapperStyle.padding；emailRoot 叠放层可用 props.padding */
  overlayPadding?: unknown;
  outerStyle?: CSSProperties;
  /** 仅在需要时开启：hug 高按底图自然比例估算可见高度（主要用于 image 块） */
  enableHugIntrinsicHeight?: boolean;
};

/** 底图叠放层 `<td>` 对齐：纵排/ grid 取 vertical；横排 layout 取 horizontal。 */
export function overlayCellAlignForWrapperBackground(
  layoutDirection: "vertical" | "horizontal" | undefined,
  contentAlign: WrapperContentAlign | undefined
): { align: "left" | "center" | "right"; valign: TableCellVerticalAlign } {
  const projected = projectLayoutContentAlign(layoutDirection ?? "vertical", contentAlign);
  const directionIsRow = layoutDirection === "horizontal";
  return overlayCellAlignFromLayoutContentAlign(directionIsRow, projected);
}

/**
 * 从 wrapperStyle 派生底图叠放画布布局。
 * 与 render-defaults `semantic.backgroundPadding` 一致：padding 仅作用于底图 td 内叠放区，不缩小底图、不打在外层 div。
 */
export function resolveWrapperBackgroundImageCanvasLayout(
  input: ResolveWrapperBackgroundImageCanvasLayoutInput
): WrapperBackgroundImageCanvasLayout | null {
  const { wrapperStyle, layoutDirection, overlayPadding, outerStyle } = input;
  const bgRaw = wrapperStyle?.backgroundImage;
  if (!bgRaw || typeof bgRaw.src !== "string" || !bgRaw.src.trim()) return null;

  const src = bgRaw.src.trim();
  const background = bgRaw;
  const wrapperBackgroundColor =
    typeof wrapperStyle?.backgroundColor === "string" && wrapperStyle.backgroundColor.trim()
      ? wrapperStyle.backgroundColor
      : IMAGE_BACKGROUND_FALLBACK_COLOR;

  const hm = wrapperStyle?.heightMode;
  const hRaw = typeof wrapperStyle?.height === "string" ? wrapperStyle.height.trim() : "";
  const fixedCanvasHeight =
    hm === "fixed" && hRaw && hRaw !== "auto" ? normalizeCssLengthPx(hRaw) ?? hRaw : undefined;
  const fillStretchHeight = hm === "fill" && !fixedCanvasHeight;

  const overlayBorderCss: CSSProperties = {};
  const bgTableBorderCollapse = "collapse" as const;
  const bgTableHeightFromTd = !!fixedCanvasHeight;
  const overlayRadiusCss = borderRadiusToCss(wrapperStyle?.borderRadius);
  const overlayPaddingCss = paddingToCss(
    overlayPadding !== undefined ? overlayPadding : wrapperStyle?.padding
  );

  const { align: overlayHorizontalAlign, valign: overlayVerticalValign } =
    overlayCellAlignForWrapperBackground(
      layoutDirection,
      wrapperStyle?.contentAlign as WrapperContentAlign | undefined
    );

  const wsBase = wrapperStyleToCss(wrapperStyle, { omitPadding: true });
  const outerBoxCss: CSSProperties = {
    ...wsBase,
    boxSizing: "border-box",
    maxWidth: "100%",
    backgroundColor: wrapperBackgroundColor,
    overflow: "hidden",
    ...outerStyle,
  };

  const linkRaw = (background as { link?: unknown }).link;
  const link = typeof linkRaw === "string" && linkRaw.trim() ? linkRaw.trim() : undefined;
  const altText = WRAPPER_BACKGROUND_IMAGE_DEFAULT_ALT;

  return {
    src,
    link,
    altText,
    fixedCanvasHeight,
    wrapperBackgroundColor,
    overlayBorderCss,
    overlayRadiusCss,
    overlayPaddingCss,
    overlayHorizontalAlign,
    overlayVerticalValign,
    outerBoxCss,
    bgPresentationFields: {
      src,
      fit: (background as { fit?: unknown }).fit,
      position: (background as { position?: unknown }).position,
    },
    bgTableBorderCollapse,
    bgTableHeightFromTd,
    fillStretchHeight,
    enableHugIntrinsicHeight:
      input.enableHugIntrinsicHeight === true &&
      wrapperStyle?.heightMode === "hug" &&
      !fixedCanvasHeight,
  };
}
