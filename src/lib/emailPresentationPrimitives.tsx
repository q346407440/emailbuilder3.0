import { Fragment, type CSSProperties, type MouseEventHandler, type ReactElement, type ReactNode } from "react";
import { EMAIL_PRESENTATION_TABLE_HTML_ATTRS } from "../render-defaults-contract/emailPresentation";
import {
  emailPresentationTableStyle,
  layoutRowAutoGapSpacerTdStyle,
  type TableCellVerticalAlign,
} from "./emailTableLayout";
import type { EmailTemplate, WrapperContentAlign, WrapperStyle } from "../types/email";
import {
  countVerticalStackFillHeightChildren,
  EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
  emailPresentationHugSlotAntiStrutStyle,
  presentationLeafShellInnerTdStyle,
  emailPresentationHugTdWidthAttr,
  emailPresentationHugTdWidthStyle,
  emailPresentationLeafShellOuterStyle,
  emailPresentationLeafShellTableStyle,
  presentationLeafShellOuterBoxCss,
  PRESENTATION_LEAF_SHELL_INNER_STRETCH_HEIGHT_STYLE,
  presentationLeafShellStretchInnerHeight,
  progressBarFillTdWidthAttr,
  verticalStackRowHeightStyle,
  wrapperContentAlignTableCellAttrs,
} from "./emailPresentationLayout";
import { borderRadiusToCss, borderToCss, paddingToCss } from "./wrapperStyleToCss";

export const emailPresentationTableProps = EMAIL_PRESENTATION_TABLE_HTML_ATTRS;

export function emailPresentationTdBase(): CSSProperties {
  return { padding: 0, border: "none", boxSizing: "border-box" };
}

type PresentationLeafShellProps = {
  className?: string;
  dataProps?: Record<string, string>;
  onClick?: MouseEventHandler<HTMLElement>;
  wrapperStyle?: WrapperStyle | null;
  /** 已由 wrapperStyleToCss 合并的外层尺寸/边距（不含 flex、不含宜下放到 td 的背景/内边距） */
  outerBoxCss: CSSProperties;
  contentAlign?: WrapperContentAlign;
  children: ReactNode;
};

/**
 * 叶子块（text / button / divider / grid 外壳）邮件呈现壳：单格 table + td 对齐与背景。
 * 画布与发信共用，禁止在外层 div 使用 flex。
 */
export function renderPresentationLeafShell(props: PresentationLeafShellProps): ReactElement {
  const { className, dataProps, onClick, wrapperStyle, outerBoxCss, contentAlign, children } = props;
  const widthMode = wrapperStyle?.widthMode;
  const cellAlign = wrapperContentAlignTableCellAttrs(contentAlign);
  const pad = paddingToCss(wrapperStyle?.padding);
  const bg =
    typeof wrapperStyle?.backgroundColor === "string" && wrapperStyle.backgroundColor.trim()
      ? wrapperStyle.backgroundColor
      : undefined;
  const tdStyle: CSSProperties = {
    ...emailPresentationTdBase(),
    ...presentationLeafShellInnerTdStyle(),
    ...emailPresentationHugTdWidthStyle(widthMode),
    verticalAlign: cellAlign.valign,
    textAlign: cellAlign.textAlign,
    ...(bg ? { backgroundColor: bg } : {}),
    ...(pad ? { padding: pad } : {}),
    ...borderToCss(wrapperStyle?.border),
    ...borderRadiusToCss(wrapperStyle?.borderRadius),
  };
  const tdWidthAttr = emailPresentationHugTdWidthAttr(widthMode);
  const stretchInnerHeight = presentationLeafShellStretchInnerHeight(wrapperStyle?.heightMode);
  const innerStretchHeightStyle = stretchInnerHeight
    ? PRESENTATION_LEAF_SHELL_INNER_STRETCH_HEIGHT_STYLE
    : {};

  return (
    <div
      className={className}
      {...dataProps}
      onClick={onClick}
      style={{
        ...emailPresentationLeafShellOuterStyle(presentationLeafShellOuterBoxCss(outerBoxCss), widthMode),
        boxSizing: "border-box",
      }}
    >
      <table
        {...emailPresentationTableProps}
        style={{
          ...emailPresentationLeafShellTableStyle(widthMode),
          ...innerStretchHeightStyle,
        }}
      >
        <tbody>
          <tr style={innerStretchHeightStyle}>
            <td
              {...(tdWidthAttr ? { width: tdWidthAttr } : {})}
              align={cellAlign.align}
              valign={cellAlign.valign}
              style={{ ...tdStyle, ...innerStretchHeightStyle }}
            >
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export type HorizontalLayoutRowCellsParams = {
  template: EmailTemplate;
  childIds: string[];
  gapAuto: boolean;
  gapPx: number;
  omitSpacerGapCells: boolean;
  childTdWidthStyle: (childId: string) => CSSProperties;
  childTdWidthAttr?: (childId: string) => string | undefined;
  fillRowInnerHeight: boolean;
  slotAlign: { align: "left" | "center" | "right"; valign: TableCellVerticalAlign };
  renderChild: (childId: string) => ReactElement;
};

/** 横排 layout 内层 `<tr>` 子槽位：fixed gap 间隔列 / gap auto 缝隙列 / 子块列。 */
export function flatMapHorizontalLayoutRowCells(params: HorizontalLayoutRowCellsParams): ReactElement[] {
  const {
    template,
    childIds,
    gapAuto,
    gapPx,
    omitSpacerGapCells,
    childTdWidthStyle,
    childTdWidthAttr,
    fillRowInnerHeight,
    slotAlign,
    renderChild,
  } = params;
  const gapSlotCount = Math.max(0, childIds.length - 1);

  return childIds.flatMap((cid, idx) => {
    const cells: ReactElement[] = [];
    if (idx > 0 && gapAuto && gapSlotCount > 0 && !omitSpacerGapCells) {
      cells.push(
        <td
          key={`layout-gap-auto-${cid}`}
          aria-hidden
          style={{
            ...emailPresentationTdBase(),
            ...EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
            ...layoutRowAutoGapSpacerTdStyle(gapSlotCount),
          }}
        >
          <div style={{ width: 1, height: 1 }} />
        </td>
      );
    }
    if (idx > 0 && !gapAuto && gapPx > 0 && !omitSpacerGapCells) {
      cells.push(
        <td
          key={`layout-gap-fixed-${cid}`}
          style={{
            ...emailPresentationTdBase(),
            width: gapPx,
            minWidth: gapPx,
            lineHeight: 0,
            fontSize: 0,
          }}
          aria-hidden
        >
          <div style={{ width: gapPx, height: 1 }} />
        </td>
      );
    }
    const childHeightMode = template.blocks[cid]?.wrapperStyle?.heightMode ?? "hug";
    cells.push(
      <td
        key={cid}
        {...(childTdWidthAttr?.(cid) ? { width: childTdWidthAttr(cid) } : {})}
        align={slotAlign.align}
        valign={slotAlign.valign}
        style={{
          ...emailPresentationTdBase(),
          verticalAlign: slotAlign.valign,
          ...emailPresentationHugSlotAntiStrutStyle(childHeightMode),
          ...childTdWidthStyle(cid),
          ...(omitSpacerGapCells && idx < childIds.length - 1 && gapPx > 0
            ? { paddingRight: gapPx }
            : {}),
          ...(fillRowInnerHeight ? { height: "100%" } : {}),
        }}
      >
        {renderChild(cid)}
      </td>
    );
    return cells;
  });
}

type VerticalStackInnerTableProps = {
  template: EmailTemplate;
  childIds: string[];
  gapAuto: boolean;
  gapFixed: string;
  gapPx: number;
  stretchColumn: boolean;
  tableWidthFull: boolean;
  stackCrossAlign: (childId: string, parentFallback: CSSProperties["alignItems"] | undefined) => "left" | "center" | "right";
  stackMainValign: (
    childId: string,
    parentFallback: CSSProperties["justifyContent"] | undefined
  ) => TableCellVerticalAlign;
  parentCrossFallback: CSSProperties["alignItems"] | undefined;
  parentMainFallback: CSSProperties["justifyContent"] | undefined;
  renderChild: (childId: string) => ReactElement;
};

/** 纵排子块栈：仅用 table 行 + gap 分隔行（禁止 flex 纵列）。 */
export function renderVerticalStackInnerTable(props: VerticalStackInnerTableProps): ReactElement {
  const {
    template,
    childIds,
    gapAuto,
    gapFixed,
    gapPx,
    stretchColumn,
    tableWidthFull,
    stackCrossAlign,
    stackMainValign,
    parentCrossFallback,
    parentMainFallback,
    renderChild,
  } = props;
  const fillChildCount = countVerticalStackFillHeightChildren(template, childIds);
  let fillChildIndex = 0;

  return (
    <table
      {...emailPresentationTableProps}
      style={{
        ...emailPresentationTableStyle,
        width: tableWidthFull ? "100%" : "auto",
        tableLayout: tableWidthFull ? "fixed" : "auto",
        ...(stretchColumn ? { height: "100%" } : {}),
      }}
    >
      <tbody style={stretchColumn ? { height: "100%" } : undefined}>
        {childIds.map((cid, idx) => {
          const hm = template.blocks[cid]?.wrapperStyle?.heightMode ?? "hug";
          const rowHeight =
            hm === "fill"
              ? verticalStackRowHeightStyle(template, cid, {
                  stretchColumn,
                  fillChildCount,
                  fillChildIndex: fillChildIndex++,
                })
              : {};
          const crossAlign = stackCrossAlign(cid, parentCrossFallback);
          const mainValign = stackMainValign(cid, parentMainFallback);
          return (
            <Fragment key={cid}>
              {idx > 0 && !gapAuto && gapPx > 0 ? (
                <tr aria-hidden>
                  <td
                    align={crossAlign}
                    style={{
                      ...emailPresentationTdBase(),
                      ...EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
                      height: gapFixed,
                    }}
                  >
                    <div style={{ height: gapFixed, width: "1px" }} />
                  </td>
                </tr>
              ) : null}
              <tr style={Object.keys(rowHeight).length > 0 ? rowHeight : undefined}>
                <td
                  align={crossAlign}
                  valign={mainValign}
                  style={{
                    ...emailPresentationTdBase(),
                    verticalAlign: mainValign,
                    ...emailPresentationHugSlotAntiStrutStyle(hm),
                    ...(stretchColumn && hm === "fill" ? { height: "100%" } : {}),
                  }}
                >
                  {renderChild(cid)}
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

type ProgressBarTableProps = {
  barWidthCss: CSSProperties;
  barHeight: string;
  fillColor: string;
  trackColor: string;
  percent: number;
  radiusCss: CSSProperties;
};

/** 进度条：双列 table 表达填充比例（禁止 flex）。 */
export function renderProgressBarTable(props: ProgressBarTableProps): ReactElement {
  const { barWidthCss, barHeight, fillColor, trackColor, percent, radiusCss } = props;
  const fillWidth = progressBarFillTdWidthAttr(percent);
  return (
    <table
      {...emailPresentationTableProps}
      style={{
        ...emailPresentationTableStyle,
        ...barWidthCss,
        ...radiusCss,
        overflow: "hidden",
        boxSizing: "border-box",
        height: barHeight,
      }}
    >
      <tbody>
        <tr>
          <td
            width={fillWidth}
            style={{
              ...emailPresentationTdBase(),
              width: fillWidth,
              height: barHeight,
              lineHeight: 0,
              fontSize: 0,
              backgroundColor: fillColor,
              padding: 0,
            }}
          >
            &#8203;
          </td>
          <td
            style={{
              ...emailPresentationTdBase(),
              height: barHeight,
              lineHeight: 0,
              fontSize: 0,
              backgroundColor: trackColor,
              padding: 0,
            }}
          >
            &#8203;
          </td>
        </tr>
      </tbody>
    </table>
  );
}
