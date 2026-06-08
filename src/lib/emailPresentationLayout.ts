import type { CSSProperties } from "react";
import type { EmailTemplate, WrapperContentAlign, WrapperHeightMode, WrapperWidthMode } from "../types/email";
import { normalizeWrapperContentAlign } from "./wrapperContentAlign";
import {
  emailPresentationTableStyle,
  tableAlignFromContentHorizontal,
  tableValignFromContentVertical,
} from "./emailTableLayout";
import type { TableCellVerticalAlign } from "./emailTableLayout";

export function normalizePresentationWidthMode(raw: unknown): WrapperWidthMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "fill";
}

export function normalizePresentationHeightMode(raw: unknown): WrapperHeightMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "hug";
}

/**
 * 消除 `<td>` 内由继承正文 line-height 产生的 strut（gap 占位行与 hug 子块槽位共用）。
 * 实现真源：本文件；消费于 `emailPresentationPrimitives` / `EmailPreview`。
 */
export const EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE: CSSProperties = {
  lineHeight: 0,
  fontSize: 0,
};

/**
 * hug 高子块所在槽位 `<td>` 应合并的 anti-strut 样式。
 * hug 宽叶壳外层为 `inline-block`，未清零 line-height 时行高常比内容高约一行 strut（典型 ~6px）。
 */
export function emailPresentationHugSlotAntiStrutStyle(heightMode: unknown): CSSProperties {
  return normalizePresentationHeightMode(heightMode) === "hug"
    ? EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE
    : {};
}

/**
 * 叶壳内层 `<td>`：消除 strut；正文字号由 `.email-text-content` 等子节点显式恢复（避免依赖继承链在发信端被撑高）。
 */
export function presentationLeafShellInnerTdStyle(): CSSProperties {
  return EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE;
}

/** contentAlign → 邮件 `<td>` 对齐属性（与 Flex 无关） */
export function wrapperContentAlignTableCellAttrs(contentAlign: WrapperContentAlign | undefined): {
  align: "left" | "center" | "right";
  valign: TableCellVerticalAlign;
  textAlign: "left" | "center" | "right";
} {
  const { horizontal, vertical } = normalizeWrapperContentAlign(contentAlign);
  return {
    align: tableAlignFromContentHorizontal(horizontal),
    valign: tableValignFromContentVertical(vertical),
    textAlign:
      horizontal === "right" ? "right" : horizontal === "center" ? "center" : "left",
  };
}

/**
 * grid 矩阵槽 `<td>`：应用栅格块 contentAlign 水平 + 竖直两轴。
 */
export function gridMatrixSlotContentAlignCss(
  contentAlign: WrapperContentAlign | undefined
): CSSProperties {
  const { horizontal, vertical } = normalizeWrapperContentAlign(contentAlign);
  return {
    textAlign: horizontal === "right" ? "right" : horizontal === "center" ? "center" : "left",
    verticalAlign: tableValignFromContentVertical(vertical),
  };
}

/** 纵排栈：统计 fill 高子块数量（用于按行分配百分比高度） */
export function countVerticalStackFillHeightChildren(
  template: EmailTemplate,
  childIds: string[]
): number {
  return childIds.filter((cid) => template.blocks[cid]?.wrapperStyle?.heightMode === "fill").length;
}

/**
 * 定高纵列内单行 `<tr>` 高度：仅 fill 高子块参与均分；hug/fixed 行不写死高度。
 * `stretchColumn` 为 true 时（父级有显式高且需撑满内层栈表）才生效。
 */
export function verticalStackRowHeightStyle(
  template: EmailTemplate,
  childId: string,
  params: {
    stretchColumn: boolean;
    fillChildCount: number;
    fillChildIndex: number;
  }
): CSSProperties {
  if (!params.stretchColumn || params.fillChildCount < 1) return {};
  const hm = template.blocks[childId]?.wrapperStyle?.heightMode ?? "hug";
  if (hm !== "fill") return {};
  if (params.fillChildCount === 1) return { height: "100%" };
  const basePct = Math.floor(100 / params.fillChildCount);
  const isLast = params.fillChildIndex === params.fillChildCount - 1;
  const pct = isLast ? 100 - basePct * (params.fillChildCount - 1) : basePct;
  return { height: `${pct}%` };
}

/** hug 宽叶子块在 `<td>` 上的经典邮件收缩写法（避免 `width: fit-content`） */
export function emailPresentationHugTdWidthStyle(widthMode: unknown): CSSProperties {
  if (normalizePresentationWidthMode(widthMode) === "hug") {
    return { width: "1%", whiteSpace: "nowrap" };
  }
  // fill/fixed 叶壳须显式 normal，避免继承横排 hug/fixed 槽位 td 的 nowrap
  return { width: "100%", whiteSpace: "normal" };
}

/** 叶壳 inner `<td>` 承载的外观键；外层 div 须剥离，避免与 td 双层描边/内边距。 */
const PRESENTATION_LEAF_SHELL_OUTER_OMIT_CSS_KEYS: (keyof CSSProperties)[] = [
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
  "backgroundColor",
  "background",
];

/** 叶壳外层 div 仅保留尺寸/对齐等；border/padding/背景/圆角只写在 inner `<td>`。 */
export function presentationLeafShellOuterBoxCss(outerBoxCss: CSSProperties): CSSProperties {
  const out = { ...outerBoxCss };
  for (const key of PRESENTATION_LEAF_SHELL_OUTER_OMIT_CSS_KEYS) {
    delete out[key];
  }
  return out;
}

/** 发信 HTML 烘焙：去掉叶壳外层 div 上与 inner td 重复的 appearance。 */
export function stripPresentationLeafShellOuterChromeFromElement(outer: HTMLElement): void {
  const props = [
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
    "background-color",
    "background",
  ] as const;
  for (const prop of props) {
    outer.style.removeProperty(prop);
  }
}

/**
 * hug 宽叶壳外层盒：随内容收缩，避免 `width:100%` 撑满父级槽位导致 contentAlign 失效。
 */
export function emailPresentationLeafShellOuterStyle(
  outerBoxCss: CSSProperties,
  widthMode: unknown
): CSSProperties {
  if (normalizePresentationWidthMode(widthMode) !== "hug") return outerBoxCss;
  return {
    ...outerBoxCss,
    width: "auto",
    maxWidth: outerBoxCss.maxWidth ?? "100%",
    /** 在满宽槽位内随内容收缩（与横排 inline-table 同理，避免块级壳被撑满） */
    display: "inline-block",
  };
}

/**
 * hug 宽 layout 外层盒：与叶壳同源，在满宽父槽位（纵排 fill 父级等）内随内容收缩。
 * `outerShellTableFullWidth` 为 true 时保留满宽行表语义，不强制收缩外壳。
 */
export function layoutPreviewHugOuterShellBoxStyle(
  outerBoxCss: CSSProperties,
  params: { widthMode: unknown; outerShellTableFullWidth: boolean }
): CSSProperties {
  if (params.outerShellTableFullWidth) return outerBoxCss;
  return emailPresentationLeafShellOuterStyle(outerBoxCss, params.widthMode);
}

/**
 * hug 宽叶壳内层表：与 fill/fixed 的满宽表区分，使有色背景与对齐仅包裹内容宽。
 */
export function emailPresentationLeafShellTableStyle(widthMode: unknown): CSSProperties {
  if (normalizePresentationWidthMode(widthMode) === "hug") {
    return {
      borderCollapse: "collapse",
      borderSpacing: 0,
      width: "auto",
      maxWidth: "100%",
      tableLayout: "auto",
    };
  }
  return { ...emailPresentationTableStyle };
}

/** hug 宽叶壳 `<td width>` 属性（经典邮件客户端收缩列） */
export function emailPresentationHugTdWidthAttr(widthMode: unknown): string | undefined {
  return normalizePresentationWidthMode(widthMode) === "hug" ? "1" : undefined;
}

/**
 * fixed/fill 高叶壳：内层 table/tr/td 须撑满外层显式高度，`contentAlign.vertical` 的 valign 才生效。
 * hug 高时 td 随内容收缩，竖直对齐无可见差异，不拉伸。
 */
export function presentationLeafShellStretchInnerHeight(heightMode: unknown): boolean {
  const hm = normalizePresentationHeightMode(heightMode);
  return hm === "fixed" || hm === "fill";
}

/** 与 {@link presentationLeafShellStretchInnerHeight} 配套，作用于叶壳内层 table/tr/td */
export const PRESENTATION_LEAF_SHELL_INNER_STRETCH_HEIGHT_STYLE: CSSProperties = { height: "100%" };

/** 进度条填充比例 → 左列 `<td width>` 百分比字符串 */
export function progressBarFillTdWidthAttr(percent: number): string {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return `${pct}%`;
}
