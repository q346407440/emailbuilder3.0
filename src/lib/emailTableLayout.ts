import type { CSSProperties } from "react";

/** 邮件画布与导出共用的 presentation table 基础样式（与 `<table role="presentation">` 搭配）。 */
export const emailPresentationTableStyle: CSSProperties = {
  borderCollapse: "collapse",
  borderSpacing: 0,
  width: "100%",
  tableLayout: "fixed",
};

export function layoutPreviewOuterTableUsesFullWidth(params: {
  widthMode: unknown;
  directionIsRow: boolean;
  gapModeAuto: boolean;
  childCount: number;
}): boolean {
  const w = params.widthMode;
  const wm: "hug" | "fill" | "fixed" =
    w === "hug" || w === "fill" || w === "fixed" ? w : "fill";
  if (wm === "fill" || wm === "fixed") return true;
  return params.directionIsRow && params.gapModeAuto && params.childCount > 0;
}

/**
 * 表格槽位内块级 `width:auto` 仍会被 `<td>` 撑满行宽；`widthMode: hug` 需 `fit-content` 才能随内容收缩。
 * `layout` / `grid` 在预览层另有专用逻辑，叶子块（button、text 等）在 BlockView 合并本样式。
 */
export function wrapperHugWidthShrinkWrapCss(widthMode: unknown): CSSProperties {
  if (widthMode === "hug") return { width: "fit-content", maxWidth: "100%" };
  return {};
}

/** 将 `layout.props.gap` 等解析为像素整数，无法解析时返回 0。 */
export function parseGapPx(gap: string | undefined): number {
  if (!gap || typeof gap !== "string") return 0;
  const t = gap.trim();
  const m = /^(\d+(?:\.\d+)?)px$/i.exec(t);
  if (m) return Math.round(Number(m[1]));
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : 0;
}

/** 横向 contentAlign.horizontal → 外层单格 `<td align>` / 表组对齐。 */
export function tableAlignFromContentHorizontal(h: unknown): "left" | "center" | "right" {
  if (h === "right") return "right";
  if (h === "center") return "center";
  return "left";
}

export type TableCellVerticalAlign = "top" | "middle" | "bottom";

/** 纵向 contentAlign.vertical → 外层单格 `<td valign>` / 表组对齐。 */
export function tableValignFromContentVertical(v: unknown): TableCellVerticalAlign {
  if (v === "bottom") return "bottom";
  if (v === "center") return "middle";
  return "top";
}

export function layoutPreviewOuterBoxFillsParentHeight(heightMode: unknown): boolean {
  return heightMode === "fill";
}

/** 纵排 layout 内层 presentation 表是否应撑满外壳（fill/fixed 或 hug+gap auto）。 */
export function layoutPreviewInnerShellStretchesHeight(params: {
  heightMode: unknown;
  directionIsRow: boolean;
  gapModeAuto: boolean;
  childCount: number;
}): boolean {
  const h = params.heightMode;
  const hm: "hug" | "fill" | "fixed" =
    h === "hug" || h === "fill" || h === "fixed" ? h : "hug";
  if (hm === "fill" || hm === "fixed") return true;
  return !params.directionIsRow && params.gapModeAuto && params.childCount > 0;
}

/** @deprecated 使用 layoutPreviewOuterBoxFillsParentHeight / layoutPreviewInnerShellStretchesHeight */
export function layoutPreviewOuterTableUsesFullHeight(params: {
  heightMode: unknown;
  directionIsRow: boolean;
  gapModeAuto: boolean;
  childCount: number;
}): boolean {
  return layoutPreviewInnerShellStretchesHeight(params);
}

export function layoutRowInnerShouldFillParentHeight(
  wrapperStyle: { heightMode?: unknown; height?: unknown } | undefined,
  childCount: number
): boolean {
  if (childCount < 1 || !wrapperStyle) return false;
  const hm = wrapperStyle.heightMode;
  if (hm === "fill") return true;
  if (hm === "fixed") {
    const h = typeof wrapperStyle.height === "string" ? wrapperStyle.height.trim() : "";
    return Boolean(h && h !== "auto");
  }
  return false;
}

function normalizeLayoutHeightMode(heightMode: unknown): "hug" | "fill" | "fixed" {
  if (heightMode === "hug" || heightMode === "fill" || heightMode === "fixed") return heightMode;
  return "hug";
}

function layoutParentHasExplicitHeight(
  wrapperStyle: { heightMode?: unknown; height?: unknown } | undefined
): boolean {
  if (!wrapperStyle) return false;
  const hm = normalizeLayoutHeightMode(wrapperStyle.heightMode);
  if (hm === "fill") return true;
  if (hm === "fixed") {
    const h = typeof wrapperStyle.height === "string" ? wrapperStyle.height.trim() : "";
    return Boolean(h && h !== "auto");
  }
  return false;
}

/**
 * 纵排内层栈表是否应撑满外壳高度。
 * 单子块 hug 时保持内容高，由外层 `contentAlign.vertical` 在满高壳内定位（与横排 contentAlign.horizontal 对称）。
 * fill 高子块或 gap auto 时仍需撑满以便分栏/拉伸。
 */
export function layoutColumnInnerShouldFillParentHeight(params: {
  wrapperStyle: { heightMode?: unknown; height?: unknown } | undefined;
  childCount: number;
  hasFillHeightChild: boolean;
  gapModeAuto: boolean;
}): boolean {
  if (params.childCount < 1 || !layoutParentHasExplicitHeight(params.wrapperStyle)) return false;
  if (params.gapModeAuto && params.childCount > 0) return true;
  if (params.hasFillHeightChild) return true;
  return false;
}

/** 纵列存在 fill 高子块且父级有定高时，内层用 flex 均分主轴高度（避免多行 `<tr height:100%>` 坍缩）。 */
export function layoutColumnShouldUseFillFlex(params: {
  wrapperStyle: { heightMode?: unknown; height?: unknown } | undefined;
  hasFillHeightChild: boolean;
}): boolean {
  return params.hasFillHeightChild && layoutParentHasExplicitHeight(params.wrapperStyle);
}

/** 主轴固定间距：auto 模式只分配剩余空间，不渲染旧的 props.gap 像素值。 */
export function layoutRenderedFixedGapPx(params: {
  gapModeAuto: boolean;
  gapPx: number;
}): number {
  return params.gapModeAuto ? 0 : params.gapPx;
}

function normalizeLayoutWidthMode(widthMode: unknown): "hug" | "fill" | "fixed" {
  if (widthMode === "hug" || widthMode === "fill" || widthMode === "fixed") return widthMode;
  return "fill";
}

/** 横排父级是否为 fill/fixed，足以让 fill 子列在行内展开。 */
export function layoutRowParentAllowsFillChildExpansion(parentWidthMode: unknown): boolean {
  const wm = normalizeLayoutWidthMode(parentWidthMode);
  return wm === "fill" || wm === "fixed";
}

/** 横排内层行表是否应收成满宽（gap auto 等分，或父 fill/fixed 且存在 fill 子块）。 */
export function layoutRowInnerShouldUseFullWidth(params: {
  parentWidthMode: unknown;
  gapModeAuto: boolean;
  childCount: number;
  hasFillWidthChild: boolean;
}): boolean {
  if (params.gapModeAuto && params.childCount > 0) return true;
  if (!params.hasFillWidthChild || params.childCount < 1) return false;
  return layoutRowParentAllowsFillChildExpansion(params.parentWidthMode);
}

/**
 * fill 子块横排行：用相邻 `<td>` 的 padding 表达 fixed gap，避免三列表格把 fill 列收成内容宽。
 */
export function layoutRowOmitsSpacerGapCells(params: {
  gapModeAuto: boolean;
  hasFillWidthChild: boolean;
  gapPx: number;
}): boolean {
  return params.hasFillWidthChild && !params.gapModeAuto && params.gapPx > 0;
}

/** 横排内层 presentation 表样式（与 EmailPreview 横排行一致）。 */
export function layoutRowInnerTablePresentationStyle(params: {
  parentWidthMode: unknown;
  gapModeAuto: boolean;
  childCount: number;
  hasFillWidthChild: boolean;
  fillRowInnerHeight?: boolean;
}): CSSProperties {
  const useFullWidth = layoutRowInnerShouldUseFullWidth(params);
  return {
    ...emailPresentationTableStyle,
    tableLayout: useFullWidth ? "fixed" : "auto",
    width: useFullWidth ? "100%" : "auto",
    maxWidth: "100%",
    ...(params.fillRowInnerHeight ? { height: "100%" } : {}),
  };
}

/**
 * 横排内层 `<td>` 列宽：gap auto 等分；满宽 fill 行内 fill 列 100%、hug 列 1% + nowrap（经典邮件表分栏）。
 */
export function layoutRowChildTdWidthStyle(
  childWidthMode: unknown,
  childFixedWidth: unknown,
  params: {
    innerTableFullWidth: boolean;
    gapModeAuto: boolean;
    childCount: number;
    rowHasFillWidthChild?: boolean;
  }
): CSSProperties {
  if (params.gapModeAuto && params.childCount > 0) {
    return { width: `${(100 / params.childCount).toFixed(4)}%` };
  }
  if (!params.innerTableFullWidth) return {};
  const wm = normalizeLayoutWidthMode(childWidthMode);
  if (wm === "hug") {
    return params.rowHasFillWidthChild
      ? { whiteSpace: "nowrap" }
      : { width: "1%", whiteSpace: "nowrap" };
  }
  if (wm === "fixed") {
    const w = typeof childFixedWidth === "string" ? childFixedWidth.trim() : "";
    if (w) return { width: w, whiteSpace: "nowrap" };
    return { width: "1%", whiteSpace: "nowrap" };
  }
  return {};
}

/** 底图叠放层外层 `<td>`：按 layout 排列方向取主轴 contentAlign（与普适纵/横排 layout 一致）。 */
export function overlayCellAlignFromLayoutContentAlign(
  directionIsRow: boolean,
  contentAlign: { horizontal?: unknown; vertical?: unknown } | undefined
): { align: "left" | "center" | "right"; valign: TableCellVerticalAlign } {
  if (directionIsRow) {
    return {
      align: tableAlignFromContentHorizontal(contentAlign?.horizontal),
      valign: "top",
    };
  }
  return {
    align: "left",
    valign: tableValignFromContentVertical(contentAlign?.vertical),
  };
}

/** 横向行槽位：子块 `placement.vertical` → `<td verticalAlign>`。 */
export function tableRowCellVerticalAlignFromPlacementAxis(
  placementVertical: "start" | "center" | "end" | undefined
): TableCellVerticalAlign | undefined {
  if (placementVertical === "end") return "bottom";
  if (placementVertical === "center") return "middle";
  if (placementVertical === "start") return "top";
  return undefined;
}

/** 横向行槽位：父级 `contentAlign.vertical` 回退 → `<td verticalAlign>`。 */
export function tableRowCellVerticalAlignFromFlexAlignItems(
  alignItems: CSSProperties["alignItems"] | undefined
): TableCellVerticalAlign {
  if (alignItems === "flex-end") return "bottom";
  if (alignItems === "center") return "middle";
  return "top";
}

/** 横排行 flex 分支：子块 placement.vertical 优先；fill 高子块铺满同一行高度。 */
export function layoutRowFlexChildWrapperStyle(params: {
  childWidthMode: unknown;
  childHeightMode: unknown;
  placementVertical: "start" | "center" | "end" | undefined;
  fallbackAlignItems: CSSProperties["alignItems"] | undefined;
}): CSSProperties {
  const wm = normalizeLayoutWidthMode(params.childWidthMode);
  const hm = normalizeLayoutHeightMode(params.childHeightMode);
  const alignSelf =
    hm === "fill"
      ? "stretch"
      : params.placementVertical === "end"
        ? "flex-end"
        : params.placementVertical === "center"
          ? "center"
          : params.placementVertical === "start"
            ? "flex-start"
            : params.fallbackAlignItems;
  return {
    flex: wm === "fill" ? "1 1 0%" : "0 0 auto",
    minWidth: wm === "fill" ? 0 : undefined,
    alignSelf,
    minHeight: hm === "fill" ? 0 : undefined,
    boxSizing: "border-box",
  };
}
