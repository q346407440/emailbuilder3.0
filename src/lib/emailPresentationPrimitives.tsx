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
  /** 画布拖拽插入占位（横排：竖条槽位） */
  insertSlot?: EmailChildInsertSlotConfig;
};

export type EmailChildInsertSlotConfig = {
  parentBlockId: string;
  renderSlot: (insertIndex: number) => ReactElement | null;
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
    insertSlot,
  } = params;
  const gapSlotCount = Math.max(0, childIds.length - 1);

  /** 与容器一致的一列 gap 单元（用于占位条朝向相邻子块一侧的对称间距）。 */
  const renderColumnGapCell = (key: string) => (
    <td
      key={key}
      aria-hidden
      style={{
        ...emailPresentationTdBase(),
        width: gapPx,
        minWidth: gapPx,
        lineHeight: 0,
        fontSize: 0,
      }}
    >
      <div style={{ width: gapPx, height: 1 }} />
    </td>
  );
  const symmetricColumnGap = !gapAuto && gapPx > 0;

  if (childIds.length === 0 && insertSlot) {
    const slot = insertSlot.renderSlot(0);
    if (slot) {
      return [
        <td key="insert-slot-0" colSpan={1} style={{ ...emailPresentationTdBase(), verticalAlign: "middle" }}>
          {slot}
        </td>,
      ];
    }
  }

  return childIds.flatMap((cid, idx) => {
    const cells: ReactElement[] = [];
    if (idx === 0 && insertSlot) {
      const slot = insertSlot.renderSlot(0);
      if (slot) {
        cells.push(
          <td
            key="insert-slot-0"
            style={{
              ...emailPresentationTdBase(),
              verticalAlign: "middle",
              width: 48,
              minWidth: 48,
            }}
          >
            {slot}
          </td>
        );
        // 占位条右侧朝向 child0，补一列与容器一致的 gap（左侧为容器起始边，不补）。
        if (symmetricColumnGap) cells.push(renderColumnGapCell("insert-gap-after-0"));
      }
    }
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
    if (insertSlot) {
      const slot = insertSlot.renderSlot(idx + 1);
      if (slot) {
        // 占位条左侧朝向 child[idx]，先补一列与容器一致的 gap；
        // 右侧若还有 child[idx+1]，其常规列间距即为右侧 gap，故只在此补左侧，避免重复。
        if (symmetricColumnGap) cells.push(renderColumnGapCell(`insert-gap-before-${idx + 1}`));
        cells.push(
          <td
            key={`insert-slot-${idx + 1}`}
            style={{
              ...emailPresentationTdBase(),
              verticalAlign: "middle",
              width: 48,
              minWidth: 48,
            }}
          >
            {slot}
          </td>
        );
      }
    }
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
  /** 画布拖拽插入占位（纵排：横条槽位） */
  insertSlot?: EmailChildInsertSlotConfig;
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
    insertSlot,
  } = props;
  const fillChildCount = countVerticalStackFillHeightChildren(template, childIds);
  let fillChildIndex = 0;

  const renderSlotRow = (insertIndex: number, key: string) => {
    if (!insertSlot) return null;
    const slot = insertSlot.renderSlot(insertIndex);
    if (!slot) return null;
    return (
      <tr key={key}>
        <td
          align="left"
          style={{
            ...emailPresentationTdBase(),
            ...EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
            verticalAlign: "top",
          }}
        >
          {slot}
        </td>
      </tr>
    );
  };

  /** 与容器一致的一条 gap 行（用于占位条两侧对称间距，以及子块之间的常规间距）。 */
  const renderInsertGapRow = (align: "left" | "center" | "right", key: string) => (
    <tr key={key} aria-hidden>
      <td
        align={align}
        style={{
          ...emailPresentationTdBase(),
          ...EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
          height: gapFixed,
        }}
      >
        <div style={{ height: gapFixed, width: "1px" }} />
      </td>
    </tr>
  );

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
        {childIds.length === 0 ? renderSlotRow(0, "insert-slot-0") : null}
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
          const fixedGap = !gapAuto && gapPx > 0;
          // 占位条激活在该槽时，向「朝向相邻真实块」的一侧补与容器一致的 gap，
          // 使夹在两块之间的占位条上下间距对称（顶/底边缘那侧贴容器 padding，不补 gap）。
          const slotActive = Boolean(insertSlot && insertSlot.renderSlot(idx));
          return (
            <Fragment key={cid}>
              {slotActive && idx > 0 && fixedGap
                ? renderInsertGapRow(crossAlign, `insert-gap-above-${idx}`)
                : null}
              {renderSlotRow(idx, `insert-slot-${idx}`)}
              {slotActive && fixedGap
                ? renderInsertGapRow(crossAlign, `insert-gap-below-${idx}`)
                : null}
              {!slotActive && idx > 0 && fixedGap
                ? renderInsertGapRow(crossAlign, `gap-${idx}`)
                : null}
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
        {childIds.length > 0 && Boolean(insertSlot && insertSlot.renderSlot(childIds.length)) ? (
          <Fragment key="insert-slot-tail">
            {!gapAuto && gapPx > 0
              ? renderInsertGapRow(
                  stackCrossAlign(childIds[childIds.length - 1]!, parentCrossFallback),
                  "insert-gap-above-end"
                )
              : null}
            {renderSlotRow(childIds.length, `insert-slot-${childIds.length}`)}
          </Fragment>
        ) : null}
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
