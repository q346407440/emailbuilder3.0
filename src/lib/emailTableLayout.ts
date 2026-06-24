import type { CSSProperties } from "react";
import type { EmailTemplate, WrapperContentAlign } from "../types/email";
import { blockProvidesDimensionAnchor } from "./wrapperHugConstraint";
import { normalizeWrapperContentAlign } from "./wrapperContentAlign";
import {
  normalizeWrapperDimensionMode,
  hugWidthMaxWidthCapCss,
} from "./canvasDimensionResolve";

/** 邮件画布与导出共用的 presentation table 基础样式（与 `<table role="presentation">` 搭配）。 */
export const emailPresentationTableStyle: CSSProperties = {
  borderCollapse: "collapse",
  borderSpacing: 0,
  width: "100%",
  tableLayout: "fixed",
};

/**
 * 横排 layout 外层 presentation 表是否须占满父槽宽度。
 * `widthMode: hug` 时内层行表仍为 inline-table 收缩；仅外层壳满宽后，
 * outer `<td align>` 才能使 `wrapperStyle.contentAlign.horizontal` 定位行组。
 */
export function layoutHorizontalOuterPresentationShellFillWidth(params: {
  directionIsRow: boolean;
  gapModeAuto: boolean;
  hasFillWidthChild: boolean;
  childCount: number;
}): boolean {
  if (!params.directionIsRow || params.childCount < 1) return false;
  return params.gapModeAuto || params.hasFillWidthChild;
}

export function layoutPreviewOuterTableUsesFullWidth(params: {
  widthMode: unknown;
  directionIsRow: boolean;
  gapModeAuto: boolean;
  hasFillWidthChild: boolean;
  childCount: number;
}): boolean {
  const w = params.widthMode;
  const wm: "hug" | "fill" | "fixed" =
    w === "hug" || w === "fill" || w === "fixed" ? w : "fill";
  if (wm === "fill" || wm === "fixed") return true;
  if (layoutHorizontalOuterPresentationShellFillWidth(params)) return true;
  return false;
}

/**
 * 表格槽位内块级 `width:auto` 仍会被 `<td>` 撑满行宽；`widthMode: hug` 需 `fit-content` 才能随内容收缩。
 * `layout` / `grid` 在预览层另有专用逻辑，叶子块（button、text 等）在 BlockView 合并本样式。
 */
/** hug 宽叶子块：宽度收缩由槽位 `<td width="1">`（HTML 属性，非 CSS 1%）承担，外层勿用 `fit-content`。 */
export function wrapperHugWidthShrinkWrapCss(widthMode: unknown): CSSProperties {
  if (normalizeWrapperDimensionMode(widthMode, "fill") === "hug") {
    return hugWidthMaxWidthCapCss();
  }
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

/**
 * layout / 底图叠放栈：子块在父级槽位内的水平对齐。
 * 仅读父级 `contentAlign.horizontal`；子块 contentAlign 只作用于其自身壳内内容。
 */
export function layoutStackCrossAlignForChild(
  _parentDirection: "vertical" | "horizontal",
  parentContentAlign: WrapperContentAlign | undefined,
  _childContentAlign?: WrapperContentAlign | undefined
): "left" | "center" | "right" {
  const parent = normalizeWrapperContentAlign(parentContentAlign);
  return tableAlignFromContentHorizontal(parent.horizontal);
}

/**
 * layout / 底图叠放栈：子块在父级槽位内的竖直对齐。
 * 仅读父级 `contentAlign.vertical`；子块 contentAlign 只作用于其自身壳内内容。
 */
export function layoutStackMainValignForChild(
  _parentDirection: "vertical" | "horizontal",
  parentContentAlign: WrapperContentAlign | undefined,
  _childContentAlign?: WrapperContentAlign | undefined
): TableCellVerticalAlign {
  const parent = normalizeWrapperContentAlign(parentContentAlign);
  return tableValignFromContentVertical(parent.vertical);
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

export function layoutRowInnerShouldFillParentHeight(
  wrapperStyle: { heightMode?: unknown; height?: unknown } | undefined,
  childCount: number,
  context?: { template: EmailTemplate; childIds: string[] }
): boolean {
  if (childCount < 1 || !wrapperStyle) return false;
  const hm = wrapperStyle.heightMode;
  if (hm === "fill") return true;
  if (hm === "fixed") {
    const h = typeof wrapperStyle.height === "string" ? wrapperStyle.height.trim() : "";
    return Boolean(h && h !== "auto");
  }
  if (hm === "hug" && context && context.childIds.length > 1) {
    const { template, childIds } = context;
    const hasFillHeightChild = childIds.some(
      (id) => template.blocks[id]?.wrapperStyle?.heightMode === "fill"
    );
    if (!hasFillHeightChild) return false;
    return childIds.some((id) => {
      if (template.blocks[id]?.wrapperStyle?.heightMode !== "fill") return false;
      return childIds.some(
        (sibId) =>
          sibId !== id && blockProvidesDimensionAnchor(template, sibId, "height")
      );
    });
  }
  return false;
}

function normalizeLayoutHeightMode(heightMode: unknown): "hug" | "fill" | "fixed" {
  if (heightMode === "hug" || heightMode === "fill" || heightMode === "fixed") return heightMode;
  return "hug";
}

/** 外壳 heightMode 为 fill，或 fixed 且带有效 height 字面量。layout / grid 定高撑满判定共用。 */
export function wrapperShellHasExplicitHeight(
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

function layoutParentHasExplicitHeight(
  wrapperStyle: { heightMode?: unknown; height?: unknown } | undefined
): boolean {
  return wrapperShellHasExplicitHeight(wrapperStyle);
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

/** 横排内层行表是否应收成满宽（gap auto 须满宽以分配缝隙列，或父 fill/fixed 且存在 fill 子块）。 */
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
 * 横排满宽行是否用 `table-layout: fixed`。
 * - hug 与 fill 混排：须 `auto`，否则 `width="1"` hug 列钉死在 1px。
 * - gap auto 且无 fill 子：须 `auto`，否则 `layoutRowAutoGapSpacerTdStyle` 的百分比缝列在 fixed 下占满表宽、子级被压成 1px。
 */
export function layoutRowInnerShouldUseFixedTableLayout(params: {
  parentWidthMode: unknown;
  gapModeAuto: boolean;
  childCount: number;
  hasFillWidthChild: boolean;
  hasHugWidthChild: boolean;
}): boolean {
  if (!layoutRowInnerShouldUseFullWidth(params)) return false;
  if (params.hasFillWidthChild && params.hasHugWidthChild) return false;
  if (params.gapModeAuto && !params.hasFillWidthChild) return false;
  return true;
}

/**
 * 横排行是否跳过独立间隔/缝隙列。
 * - fixed gap：始终用独立 `<td>` 表达间距（hugA 宽 + gap + 下一子宽，加性分配；勿把 gap 折进 hug 列 padding）。
 * - gap auto 且同行有 fill：不插缝隙列，主轴剩余由 fill 吃掉（`props.gap` 像素值亦不渲染）。
 */
export function layoutRowOmitsSpacerGapCells(params: {
  gapModeAuto: boolean;
  hasFillWidthChild: boolean;
  gapPx: number;
}): boolean {
  void params.gapPx;
  return params.hasFillWidthChild && params.gapModeAuto;
}

/** 横排内层 presentation 表样式（与 EmailPreview 横排行一致）。 */
export function layoutRowInnerTablePresentationStyle(params: {
  parentWidthMode: unknown;
  gapModeAuto: boolean;
  childCount: number;
  hasFillWidthChild: boolean;
  hasHugWidthChild?: boolean;
  fillRowInnerHeight?: boolean;
}): CSSProperties {
  const useFullWidth = layoutRowInnerShouldUseFullWidth(params);
  if (!useFullWidth) {
    return {
      borderCollapse: "collapse",
      borderSpacing: 0,
      tableLayout: "auto",
      /** 经典邮件收缩写法：先占 1px 再随内容撑开，避免在满宽 `<td>` 内被拉满 */
      width: "1px",
      maxWidth: "100%",
      display: "inline-table",
      ...(params.fillRowInnerHeight ? { height: "100%" } : {}),
    };
  }
  const useFixedTableLayout = layoutRowInnerShouldUseFixedTableLayout({
    ...params,
    hasHugWidthChild: params.hasHugWidthChild ?? false,
  });
  if (useFixedTableLayout) {
    return {
      ...emailPresentationTableStyle,
      tableLayout: "fixed",
      width: "100%",
      maxWidth: "100%",
      ...(params.fillRowInnerHeight ? { height: "100%" } : {}),
    };
  }
  return {
    borderCollapse: "collapse",
    borderSpacing: 0,
    tableLayout: "auto",
    width: "100%",
    maxWidth: "100%",
    ...(params.fillRowInnerHeight ? { height: "100%" } : {}),
  };
}

/**
 * 横排 gap auto：缝隙列均分剩余空间（非子级均分）。`gapSlotCount` = 子块数 − 1。
 * 百分比缝列仅在 `table-layout: auto` 满宽行内按「扣除 hug 占位后的剩余宽」分配；fixed 表下勿用。
 */
export function layoutRowAutoGapSpacerTdStyle(gapSlotCount: number): CSSProperties {
  if (gapSlotCount < 1) return {};
  if (gapSlotCount === 1) return { width: "100%" };
  return { width: `${(100 / gapSlotCount).toFixed(4)}%` };
}

/**
 * 横排内层 `<td>` 列宽：满宽行内 hug 列用 `nowrap` + 调用方补 HTML `width="1"`；fill 列 100% 吃剩余宽。
 * 纵排 layout（卡片壳）包在 hug 列内时勿 nowrap，否则壳内长文案无法换行。
 * gap auto 的缝隙由 `layoutRowAutoGapSpacerTdStyle` 单独列承担，不在此均分子级。
 */
export function layoutRowChildTdWidthStyle(
  childWidthMode: unknown,
  childFixedWidth: unknown,
  params: {
    innerTableFullWidth: boolean;
    innerTableUsesFixedLayout?: boolean;
    gapModeAuto: boolean;
    childCount: number;
    rowHasFillWidthChild?: boolean;
    rowHasHugWidthChild?: boolean;
    /** 子块为纵排 layout.container（如卡片 stack 落盘）。 */
    childIsVerticalLayout?: boolean;
  }
): CSSProperties {
  void params.gapModeAuto;
  void params.childCount;
  void params.rowHasFillWidthChild;
  void params.rowHasHugWidthChild;
  const wm = normalizeLayoutWidthMode(childWidthMode);
  const hugOmitsNowrap = wm === "hug" && params.childIsVerticalLayout === true;
  if (!params.innerTableFullWidth) {
    /** 内层表已 inline-table 收缩时，列宽随内容；勿用 1%（会在被撑满的表宽上均分列） */
    if (wm === "hug" && !hugOmitsNowrap) return { whiteSpace: "nowrap" };
    return {};
  }
  if (wm === "hug") {
    if (hugOmitsNowrap) return {};
    /** 勿用 CSS `width:1%`（会按表宽算成几像素）；列宽由 `emailPresentationHugTdWidthAttr` → `<td width="1">` */
    return { whiteSpace: "nowrap" };
  }
  if (wm === "fixed") {
    const w = typeof childFixedWidth === "string" ? childFixedWidth.trim() : "";
    // 列宽已由 width 钉死；勿写 nowrap（会继承到纵排子树，导致 fill 文本无法换行）
    return w ? { width: w } : {};
  }
  /** 满宽 + auto 表：fill 列勿写 100%（会抢整表宽）；由 hug/gap 先占位后吃剩余 */
  if (params.innerTableUsesFixedLayout === false) {
    return { minWidth: 0 };
  }
  return { width: "100%" };
}

/**
 * 横排内层 `<td width>` 属性：满宽行内 hug 列补经典邮件 `width="1"`，
 * 让同行存在 fill 列时，hug 列先按内容收缩，再把剩余宽度留给 fill。
 */
export function layoutRowChildTdWidthAttr(
  childWidthMode: unknown,
  params: { innerTableFullWidth: boolean }
): string | undefined {
  if (!params.innerTableFullWidth) return undefined;
  return normalizeLayoutWidthMode(childWidthMode) === "hug" ? "1" : undefined;
}

/** 底图叠放层外层 `<td>`：使用容器 contentAlign 水平 + 竖直两轴。 */
export function overlayCellAlignFromLayoutContentAlign(
  _directionIsRow: boolean,
  contentAlign: { horizontal?: unknown; vertical?: unknown } | undefined
): { align: "left" | "center" | "right"; valign: TableCellVerticalAlign } {
  return {
    align: tableAlignFromContentHorizontal(contentAlign?.horizontal),
    valign: tableValignFromContentVertical(contentAlign?.vertical),
  };
}

export function tableRowCellVerticalAlignFromFlexAlignItems(
  alignItems: CSSProperties["alignItems"] | undefined
): TableCellVerticalAlign {
  if (alignItems === "flex-end") return "bottom";
  if (alignItems === "center") return "middle";
  return "top";
}

export function layoutRowFlexChildWrapperStyle(params: {
  childWidthMode: unknown;
  childHeightMode: unknown;
  contentAlignVertical?: "start" | "center" | "end" | undefined;
  fallbackAlignItems: CSSProperties["alignItems"] | undefined;
}): CSSProperties {
  const wm = normalizeLayoutWidthMode(params.childWidthMode);
  const hm = normalizeLayoutHeightMode(params.childHeightMode);
  const alignSelf =
    hm === "fill"
      ? "stretch"
      : params.contentAlignVertical === "end"
        ? "flex-end"
        : params.contentAlignVertical === "center"
          ? "center"
          : params.contentAlignVertical === "start"
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
