import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactElement,
} from "react";
import type {
  BorderRadiusValue,
  EmailTemplate,
  LayoutBlockProps,
  WrapperContentAlign,
  WrapperStyle,
} from "../types/email";
import { resolveIconPreviewColor, resolveIconPreviewSrc } from "../lib/iconBlock";
import { IMAGE_BACKGROUND_FALLBACK_COLOR } from "../lib/imageBackgroundFallback";
import { EMAIL_ROOT_FIXED_WIDTH, EMAIL_CANVAS_WORKSPACE_BACKGROUND } from "../render-defaults-contract/values";
import { BUTTON_INNER_PADDING } from "../lib/buttonInnerPadding";
import { IconGlyph } from "./IconGlyph";
import { DEFAULT_EMAIL_FONT_FAMILY, resolveRenderFontFamily } from "../font-family-contract";
import {
  emailPresentationTableStyle,
  layoutColumnInnerShouldFillParentHeight,
  layoutColumnShouldUseFillFlex,
  layoutPreviewOuterTableUsesFullWidth,
  layoutPreviewOuterBoxFillsParentHeight,
  layoutPreviewInnerShellStretchesHeight,
  layoutRenderedFixedGapPx,
  layoutRowChildTdWidthStyle,
  layoutRowFlexChildWrapperStyle,
  layoutRowInnerShouldFillParentHeight,
  layoutRowInnerShouldUseFullWidth,
  layoutRowInnerTablePresentationStyle,
  layoutRowOmitsSpacerGapCells,
  overlayCellAlignFromLayoutContentAlign,
  parseGapPx,
  tableAlignFromContentHorizontal,
  tableValignFromContentVertical,
  tableRowCellVerticalAlignFromFlexAlignItems,
  tableRowCellVerticalAlignFromPlacementAxis,
  wrapperHugWidthShrinkWrapCss,
} from "../lib/emailTableLayout";
import {
  buildPlacementResolveInputFromWrapper,
  effectivePlacementAxes,
} from "../lib/resolvePlacement";
import { resolvePlacementToCss } from "../lib/resolvePlacementCss";
import { placementParentKindForBlock } from "../lib/placementParentContext";
import { sourceBlockIdFromRepeatClone } from "../lib/repeatRegion";
import {
  FIXED_TEXT_LINE_HEIGHT,
  projectLayoutContentAlign,
  projectLayoutInnerStackContentAlign,
} from "../render-defaults-contract/values";
import {
  borderRadiusToCss,
  borderToCss,
  paddingToCss,
  wrapperStyleToCss,
} from "../lib/wrapperStyleToCss";
import { renderTextBodyToHtml } from "../lib/textBodyFormat";
import { imageObjectPositionCssForFit } from "../lib/imageObjectPosition";
import { normalizeCssLengthPx } from "../lib/wrapperBackgroundImage";
import {
  gridRowHeightsStable,
  measureGridRowContentMaxHeights,
  stabilizeGridRowHeights,
} from "../lib/gridContentMaxHeight";
import { normalizeWrapperContentAlign } from "../lib/wrapperContentAlign";

type Props = {
  template: EmailTemplate;
  /** 与左侧树一致：`null` 表示画布（emailRoot）选中 */
  selectedBlockId: string | null;
  /** 画布点击命中后，回写选中区块 id（emailRoot 使用 null） */
  onSelectBlock: (id: string | null) => void;
};

/** 画布内链接仅作视觉还原，禁止跳转/新开页，避免误触影响区块选中 */
const stopCanvasLinkNavigation: MouseEventHandler<HTMLAnchorElement> = (e) => {
  e.preventDefault();
};

function layoutFlexDirection(dir: unknown): "row" | "column" {
  return dir === "horizontal" ? "row" : "column";
}

function normalizeLayoutGapMode(raw: unknown): "fixed" | "auto" {
  return raw === "auto" ? "auto" : "fixed";
}

function normalizeCssSize(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return v ? v : undefined;
}

function componentBodyWidthCss(opts: {
  mode: unknown;
  width: unknown;
  defaultMode: "hug" | "fill";
}): Pick<CSSProperties, "display" | "width" | "maxWidth"> {
  const mode =
    opts.mode === "fixed" || opts.mode === "fill" || opts.mode === "hug"
      ? opts.mode
      : opts.defaultMode;
  if (mode === "fill") {
    return { display: "block", width: "100%", maxWidth: "100%" };
  }
  if (mode === "fixed") {
    const width = normalizeCssSize(opts.width);
    return { display: "block", ...(width ? { width } : {}), maxWidth: "100%" };
  }
  return { display: "inline-block", maxWidth: "100%" };
}

function layoutContentAlignToFlex(
  direction: "row" | "column",
  contentAlign: { horizontal?: unknown; vertical?: unknown } | undefined
): Pick<CSSProperties, "justifyContent" | "alignItems"> {
  const horizontal = contentAlign?.horizontal;
  const vertical = contentAlign?.vertical;

  const horizontalMainAxis =
    horizontal === "left" ? "flex-start" : horizontal === "right" ? "flex-end" : "center";
  const verticalMainAxis =
    vertical === "top" ? "flex-start" : vertical === "bottom" ? "flex-end" : "center";
  const horizontalCrossAxis =
    horizontal === "left"
      ? "flex-start"
      : horizontal === "right"
        ? "flex-end"
        : horizontal === "center"
          ? "center"
          : "stretch";
  const verticalCrossAxis =
    vertical === "top"
      ? "flex-start"
      : vertical === "bottom"
        ? "flex-end"
        : vertical === "center"
          ? "center"
          : "stretch";

  if (direction === "row") {
    return {
      justifyContent: horizontalMainAxis,
      alignItems: verticalCrossAxis,
    };
  }
  return {
    justifyContent: verticalMainAxis,
    alignItems: horizontalCrossAxis,
  };
}

function contentAlignVerticalFlexCss(
  contentAlign: WrapperContentAlign | undefined
): Pick<CSSProperties, "display" | "flexDirection" | "justifyContent"> {
  const { vertical } = normalizeWrapperContentAlign(contentAlign);
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent:
      vertical === "bottom" ? "flex-end" : vertical === "center" ? "center" : "flex-start",
  };
}

function contentAlignFlexCss(
  contentAlign: WrapperContentAlign | undefined
): Pick<CSSProperties, "display" | "flexDirection" | "justifyContent" | "alignItems"> {
  const { horizontal, vertical } = normalizeWrapperContentAlign(contentAlign);
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent:
      vertical === "bottom" ? "flex-end" : vertical === "center" ? "center" : "flex-start",
    alignItems:
      horizontal === "right" ? "flex-end" : horizontal === "center" ? "center" : "flex-start",
  };
}

const emailTablePresentationProps = {
  role: "presentation" as const,
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
};

function tdBase(): CSSProperties {
  return { padding: 0, border: "none", boxSizing: "border-box" };
}

/** 横向行内单个子槽位：优先子块 `placement.vertical`，否则父级 contentAlign 交叉轴。 */
function crossVerticalAlignForTableRowChild(
  template: EmailTemplate,
  childId: string,
  parentFallback: CSSProperties["alignItems"] | undefined
): "top" | "middle" | "bottom" {
  const child = template.blocks[childId];
  if (child) {
    const axes = effectivePlacementAxes(
      buildPlacementResolveInputFromWrapper(child.wrapperStyle as WrapperStyle, "tableRowCell")
    );
    const fromPlacement = tableRowCellVerticalAlignFromPlacementAxis(axes.vertical);
    if (fromPlacement) return fromPlacement;
  }
  return tableRowCellVerticalAlignFromFlexAlignItems(parentFallback);
}

/** 纵向堆叠交叉轴（水平）← flex alignItems */
function crossHorizontalAlignAttrFromFlexAlignItems(
  alignItems: CSSProperties["alignItems"] | undefined
): "left" | "center" | "right" {
  if (alignItems === "flex-end") return "right";
  if (alignItems === "center") return "center";
  return "left";
}

/** 纵向堆叠主轴（竖直）← flex justifyContent */
function stackValignFromFlexJustify(
  justify: CSSProperties["justifyContent"] | undefined
): "top" | "middle" | "bottom" {
  if (justify === "flex-end") return "bottom";
  if (justify === "center" || justify === "space-around" || justify === "space-evenly") return "middle";
  return "top";
}

function columnHasFillHeightChild(template: EmailTemplate, childIds: string[]): boolean {
  return childIds.some((cid) => {
    const child = template.blocks[cid];
    const hm = child?.wrapperStyle?.heightMode ?? "hug";
    return hm === "fill";
  });
}

function resolveColumnInnerFillParentHeight(
  template: EmailTemplate,
  wrapperStyle: WrapperStyle | undefined,
  childIds: string[],
  gapModeAuto: boolean
): boolean {
  return layoutColumnInnerShouldFillParentHeight({
    wrapperStyle,
    childCount: childIds.length,
    hasFillHeightChild: columnHasFillHeightChild(template, childIds),
    gapModeAuto,
  });
}

/** 画布滚动定位锚点（与左侧 `data-block-tree-row` 成对） */
function canvasPreviewBlockDataProps(blockId: string): { "data-email-preview-block": string } {
  return { "data-email-preview-block": sourceBlockIdFromRepeatClone(blockId) };
}

/** 画布选中 emailRoot 时为内层内容区容器加框（宽度取 props.width，缺省同 EMAIL_ROOT_FIXED_WIDTH）；子 block 按 id 匹配 */
function selectionClassName(
  selectedBlockId: string | null,
  nodeId: string,
  variant: "email-root-inner" | "node"
): string | undefined {
  const selected =
    variant === "email-root-inner"
      ? selectedBlockId === null
      : selectedBlockId === nodeId || selectedBlockId === sourceBlockIdFromRepeatClone(nodeId);
  return selected ? "email-preview-selected" : undefined;
}

type PreviewPlacementParent = ReturnType<typeof placementParentKindForBlock>;

/** 纵向栈单个子槽位：优先子块 `placement.vertical`（主轴），否则父级 contentAlign 主轴。 */
function stackMainAxisValignForTableStackChild(
  template: EmailTemplate,
  childId: string,
  parentFallback: CSSProperties["justifyContent"] | undefined
): "top" | "middle" | "bottom" {
  const child = template.blocks[childId];
  if (child) {
    const axes = effectivePlacementAxes(
      buildPlacementResolveInputFromWrapper(child.wrapperStyle as WrapperStyle, "tableStackCell")
    );
    const fromPlacement = tableRowCellVerticalAlignFromPlacementAxis(axes.vertical);
    if (fromPlacement) return fromPlacement;
  }
  return stackValignFromFlexJustify(parentFallback);
}

/** 纵向栈单个子槽位：优先子块 `placement.horizontal`（交叉轴），否则父级 contentAlign 交叉轴。 */
function stackCrossAxisAlignForTableStackChild(
  template: EmailTemplate,
  childId: string,
  parentFallback: CSSProperties["alignItems"] | undefined
): "left" | "center" | "right" {
  const child = template.blocks[childId];
  if (child) {
    const axes = effectivePlacementAxes(
      buildPlacementResolveInputFromWrapper(child.wrapperStyle as WrapperStyle, "tableStackCell")
    );
    if (axes.horizontal === "end") return "right";
    if (axes.horizontal === "center") return "center";
    if (axes.horizontal === "start") return "left";
  }
  return crossHorizontalAlignAttrFromFlexAlignItems(parentFallback);
}

/** 横排 layout / 底图叠放：内层行表是否满宽及子槽位列宽（fill 子块吃剩余宽）。 */
function horizontalRowInnerTableLayout(
  template: EmailTemplate,
  childIds: string[],
  parentWrapperStyle: WrapperStyle | undefined,
  gapAuto: boolean,
  gapPx: number,
  fillRowInnerHeight: boolean
): {
  innerTableStyle: CSSProperties;
  childTdWidthStyle: (childId: string) => CSSProperties;
  omitSpacerGapCells: boolean;
} {
  const childCount = childIds.length;
  const hasFillWidthChild = childIds.some((cid) => {
    const child = template.blocks[cid];
    return (child?.wrapperStyle?.widthMode ?? "fill") === "fill";
  });
  const innerTableFullWidth = layoutRowInnerShouldUseFullWidth({
    parentWidthMode: parentWrapperStyle?.widthMode,
    gapModeAuto: gapAuto,
    childCount,
    hasFillWidthChild,
  });
  const innerTableStyle = layoutRowInnerTablePresentationStyle({
    parentWidthMode: parentWrapperStyle?.widthMode,
    gapModeAuto: gapAuto,
    childCount,
    hasFillWidthChild,
    fillRowInnerHeight,
  });
  const omitSpacerGapCells = layoutRowOmitsSpacerGapCells({
    gapModeAuto: gapAuto,
    hasFillWidthChild,
    gapPx,
  });
  const childTdWidthStyle = (childId: string): CSSProperties => {
    const child = template.blocks[childId];
    return layoutRowChildTdWidthStyle(child?.wrapperStyle?.widthMode, child?.wrapperStyle?.width, {
      innerTableFullWidth,
      gapModeAuto: gapAuto,
      childCount,
      rowHasFillWidthChild: hasFillWidthChild,
    });
  };
  return { innerTableStyle, childTdWidthStyle, omitSpacerGapCells };
}

/** 纵列 fill 高子块交叉轴对齐：子 placement.horizontal → flex alignItems。 */
function columnCrossAxisAlignFromChildPlacement(
  template: EmailTemplate,
  childId: string,
  parentFallback: CSSProperties["alignItems"] | undefined
): CSSProperties["alignItems"] {
  const child = template.blocks[childId];
  if (child) {
    const axes = effectivePlacementAxes(
      buildPlacementResolveInputFromWrapper(child.wrapperStyle as WrapperStyle, "tableStackCell")
    );
    if (axes.horizontal === "end") return "flex-end";
    if (axes.horizontal === "center") return "center";
    if (axes.horizontal === "start") return "flex-start";
  }
  return parentFallback ?? "flex-start";
}

/** fill 子块纵列：flex 均分主轴高（fill 吃份 + fixed gap + hug/fixed 随内容）。 */
function renderVerticalColumnFillFlex(
  template: EmailTemplate,
  childIds: string[],
  renderedGapPx: number,
  axisAlign: { alignItems?: CSSProperties["alignItems"]; justifyContent?: CSSProperties["justifyContent"] },
  selectedBlockId: string | null,
  onSelectBlock: (id: string | null) => void
): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        ...(renderedGapPx > 0 ? { gap: renderedGapPx } : {}),
      }}
    >
      {childIds.map((cid) => {
        const child = template.blocks[cid];
        const hm = child?.wrapperStyle?.heightMode ?? "hug";
        return (
          <div
            key={cid}
            style={{
              flex: hm === "fill" ? "1 1 0%" : "0 0 auto",
              minHeight: hm === "fill" ? 0 : undefined,
              display: "flex",
              alignItems: columnCrossAxisAlignFromChildPlacement(template, cid, axisAlign.alignItems),
              boxSizing: "border-box",
            }}
          >
            <BlockView
              id={cid}
              template={template}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
            />
          </div>
        );
      })}
    </div>
  );
}

/** fill 子块横排行：flex 分栏（fill 吃剩余 + fixed gap + hug/fixed 随内容）。 */
function renderHorizontalRowFillFlex(
  template: EmailTemplate,
  childIds: string[],
  renderedGapPx: number,
  alignItems: CSSProperties["alignItems"] | undefined,
  selectedBlockId: string | null,
  onSelectBlock: (id: string | null) => void
): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        alignItems: alignItems ?? "flex-start",
        boxSizing: "border-box",
      }}
    >
      {childIds.map((cid, idx) => {
        const child = template.blocks[cid];
        const axes = child
          ? effectivePlacementAxes(
              buildPlacementResolveInputFromWrapper(child.wrapperStyle as WrapperStyle, "tableRowCell")
            )
          : { horizontal: undefined, vertical: undefined };
        return (
          <div
            key={cid}
            style={{
              ...layoutRowFlexChildWrapperStyle({
                childWidthMode: child?.wrapperStyle?.widthMode,
                childHeightMode: child?.wrapperStyle?.heightMode,
                placementVertical: axes.vertical,
                fallbackAlignItems: alignItems,
              }),
              marginRight: idx < childIds.length - 1 && renderedGapPx > 0 ? renderedGapPx : undefined,
            }}
          >
            <BlockView
              id={cid}
              template={template}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
            />
          </div>
        );
      })}
    </div>
  );
}

/** 底图叠放层内子区块：与 layout 纵向/横向 + gap 语义对齐 */
function renderBackgroundImageOverlayChildren(opts: {
  childIds: string[];
  layoutProps?: LayoutBlockProps;
  wrapperStyle?: WrapperStyle;
  contentAlign?: { horizontal?: unknown; vertical?: unknown };
  template: EmailTemplate;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}): ReactElement {
  const { childIds, layoutProps, wrapperStyle, contentAlign, template, selectedBlockId, onSelectBlock } = opts;
  const gapMode = normalizeLayoutGapMode(layoutProps?.gapMode);
  const gapFixed = (layoutProps?.gap as string) ?? "8px";
  const gapAuto = gapMode === "auto";
  const gapPx = parseGapPx(gapFixed);
  const renderedFixedGapPx = layoutRenderedFixedGapPx({ gapModeAuto: gapAuto, gapPx });
  const direction = layoutFlexDirection(layoutProps?.direction ?? "vertical");
  const innerStackAlign = projectLayoutInnerStackContentAlign(layoutProps?.direction);
  const isRow = direction === "row";
  const rowStackAlign = isRow
    ? projectLayoutContentAlign(layoutProps?.direction, contentAlign as WrapperContentAlign | undefined)
    : innerStackAlign;
  const axisAlign = layoutContentAlignToFlex(direction, rowStackAlign);
  const fillColumnInnerHeight = resolveColumnInnerFillParentHeight(
    template,
    wrapperStyle,
    childIds,
    gapAuto
  );
  const fillRowInnerHeight = layoutRowInnerShouldFillParentHeight(wrapperStyle, childIds.length);
  const columnFillFlex = layoutColumnShouldUseFillFlex({
    wrapperStyle,
    hasFillHeightChild: columnHasFillHeightChild(template, childIds),
  });

  if (isRow) {
    const { innerTableStyle, childTdWidthStyle, omitSpacerGapCells } = horizontalRowInnerTableLayout(
      template,
      childIds,
      wrapperStyle,
      gapAuto,
      gapPx,
      fillRowInnerHeight
    );
    if (omitSpacerGapCells) {
      return renderHorizontalRowFillFlex(
        template,
        childIds,
        renderedFixedGapPx,
        axisAlign.alignItems,
        selectedBlockId,
        onSelectBlock
      );
    }
    return (
      <table
        {...emailTablePresentationProps}
        style={innerTableStyle}
      >
        <tbody style={fillRowInnerHeight ? { height: "100%" } : undefined}>
          <tr style={fillRowInnerHeight ? { height: "100%" } : undefined}>
            {childIds.flatMap((cid, idx) => {
              const cells: ReactElement[] = [];
              if (idx > 0 && !gapAuto && gapPx > 0 && !omitSpacerGapCells) {
                cells.push(
                  <td
                    key={`bg-gap-${cid}`}
                    style={{
                      ...tdBase(),
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
              const rowChildValign = crossVerticalAlignForTableRowChild(
                template,
                cid,
                axisAlign.alignItems
              );
              cells.push(
                <td
                  key={cid}
                  valign={rowChildValign}
                  style={{
                    ...tdBase(),
                    verticalAlign: rowChildValign,
                    ...childTdWidthStyle(cid),
                    ...(omitSpacerGapCells && idx < childIds.length - 1 && gapPx > 0
                      ? { paddingRight: gapPx }
                      : {}),
                    ...(fillRowInnerHeight ? { height: "100%" } : {}),
                  }}
                >
                  <BlockView
                    id={cid}
                    template={template}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={onSelectBlock}
                  />
                </td>
              );
              return cells;
            })}
          </tr>
        </tbody>
      </table>
    );
  }

  if (columnFillFlex) {
    return renderVerticalColumnFillFlex(
      template,
      childIds,
      renderedFixedGapPx,
      axisAlign,
      selectedBlockId,
      onSelectBlock
    );
  }

  return (
    <table
      {...emailTablePresentationProps}
      style={{
        ...emailPresentationTableStyle,
        width: "100%",
        tableLayout: "fixed",
        ...(fillColumnInnerHeight ? { height: "100%" } : {}),
      }}
    >
      <tbody style={fillColumnInnerHeight ? { height: "100%" } : undefined}>
        {childIds.map((cid, idx) => (
          <Fragment key={cid}>
            {idx > 0 && !gapAuto && gapPx > 0 ? (
              <tr aria-hidden>
                <td
                  align={stackCrossAxisAlignForTableStackChild(template, cid, axisAlign.alignItems)}
                  style={{
                    ...tdBase(),
                    lineHeight: 0,
                    fontSize: 0,
                    height: gapFixed,
                  }}
                >
                  <div style={{ height: gapFixed, width: "1px" }} />
                </td>
              </tr>
            ) : null}
            <tr style={fillColumnInnerHeight ? { height: "100%" } : undefined}>
              <td
                align={stackCrossAxisAlignForTableStackChild(template, cid, axisAlign.alignItems)}
                valign={stackMainAxisValignForTableStackChild(template, cid, axisAlign.justifyContent)}
                style={{
                  ...tdBase(),
                  verticalAlign: stackMainAxisValignForTableStackChild(
                    template,
                    cid,
                    axisAlign.justifyContent
                  ),
                  ...(fillColumnInnerHeight ? { height: "100%" } : {}),
                }}
              >
                <BlockView
                  id={cid}
                  template={template}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                />
              </td>
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

/** layout 容器底图与 image 块共用：底图 `<img>` + 叠放子项表格 */
function renderWrapperBackgroundImagePreview(opts: {
  blockId: string;
  wrapperStyle: WrapperStyle | undefined;
  childIds: string[];
  layoutProps?: LayoutBlockProps;
  template: EmailTemplate;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  placementParent: PreviewPlacementParent;
  overlayPadding?: unknown;
  selectTargetId?: string | null;
  selectionKind?: "node" | "email-root-inner";
  outerStyle?: CSSProperties;
}): ReactElement | null {
  const {
    blockId,
    wrapperStyle,
    childIds,
    layoutProps,
    template,
    selectedBlockId,
    onSelectBlock,
    placementParent,
    overlayPadding,
    selectionKind = "node",
    outerStyle,
  } = opts;
  const selectTargetId: string | null =
    opts.selectTargetId === null ? null : opts.selectTargetId ?? blockId;
  const bgImg = wrapperStyle?.backgroundImage;
  if (!bgImg || typeof bgImg.src !== "string" || !bgImg.src.trim()) return null;

  const background = bgImg;
  const wrapperBackgroundColor =
    typeof wrapperStyle?.backgroundColor === "string" && wrapperStyle.backgroundColor.trim()
      ? wrapperStyle.backgroundColor
      : IMAGE_BACKGROUND_FALLBACK_COLOR;
  const overlayBorderCss = borderToCss((background as { border?: unknown }).border);
  const overlayRadiusCss = borderRadiusToCss((background as { borderRadius?: unknown }).borderRadius);
  const hm = wrapperStyle?.heightMode;
  const hRaw = typeof wrapperStyle?.height === "string" ? wrapperStyle.height.trim() : "";
  const fixedCanvasHeight =
    hm === "fixed" && hRaw && hRaw !== "auto" ? normalizeCssLengthPx(hRaw) ?? hRaw : undefined;

  const wsBase = wrapperStyleToCss(wrapperStyle, { omitPadding: true });
  const placementLay = resolvePlacementToCss(wrapperStyle, placementParent);
  const wsOuter = { ...wsBase, ...placementLay };

  const wrapperContentAlign = projectLayoutContentAlign(
    layoutProps?.direction,
    wrapperStyle?.contentAlign as WrapperContentAlign | undefined
  );
  const overlayIsRow = layoutFlexDirection(layoutProps?.direction ?? "vertical") === "row";
  const { align: overlayHorizontalAlign, valign: overlayVerticalValign } =
    overlayCellAlignFromLayoutContentAlign(overlayIsRow, wrapperContentAlign);
  const overlayPaddingCss = paddingToCss(overlayPadding !== undefined ? overlayPadding : wrapperStyle?.padding);

  const nodeSel = selectionClassName(selectedBlockId, blockId, selectionKind);

  const selectBlock =
    (targetId: string | null): MouseEventHandler<HTMLElement> =>
    (e) => {
      const t = e.target;
      const el: Element | null =
        t instanceof Element ? t : t instanceof Text ? t.parentElement : null;
      if (el?.closest("a")) e.preventDefault();
      e.stopPropagation();
      onSelectBlock(targetId);
    };

  const contentNode = (
    <div
      style={{
        width: "100%",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <img
        src={background.src}
        alt={typeof background.alt === "string" ? background.alt : ""}
        style={{
          display: "block",
          width: "100%",
          height: fixedCanvasHeight ?? "auto",
          objectFit: background.fit === "contain" ? "contain" : "cover",
          objectPosition: imageObjectPositionCssForFit(background.position, background.fit),
          ...overlayRadiusCss,
          backgroundColor: wrapperBackgroundColor,
        }}
      />
      <table
        {...emailTablePresentationProps}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          borderCollapse: "collapse",
          borderSpacing: 0,
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr>
            <td
              align={overlayHorizontalAlign}
              valign={overlayVerticalValign}
              style={{
                ...tdBase(),
                width: "100%",
                height: "100%",
                ...(overlayPaddingCss ? { padding: overlayPaddingCss } : {}),
              }}
            >
              {renderBackgroundImageOverlayChildren({
                childIds,
                layoutProps,
                wrapperStyle,
                contentAlign: wrapperContentAlign,
                template,
                selectedBlockId,
                onSelectBlock,
              })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const backgroundStyle: CSSProperties = {
    ...wsOuter,
    boxSizing: "border-box",
    maxWidth: "100%",
    backgroundColor: wrapperBackgroundColor,
    overflow: "hidden",
    ...overlayBorderCss,
    ...outerStyle,
  };

  return (
    <div
      className={nodeSel}
      {...canvasPreviewBlockDataProps(blockId)}
      onClick={selectBlock(selectTargetId)}
      style={backgroundStyle}
    >
      {typeof background.link === "string" && background.link.trim() ? (
        <a
          href={background.link}
          style={{ display: "block", textDecoration: "none" }}
          onClick={stopCanvasLinkNavigation}
          onAuxClick={stopCanvasLinkNavigation}
        >
          {contentNode}
        </a>
      ) : (
        contentNode
      )}
    </div>
  );
}

type BlockViewProps = {
  id: string;
  template: EmailTemplate;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
};

function BlockView({ id, template, selectedBlockId, onSelectBlock }: BlockViewProps) {
  const b = template.blocks[id];
  if (!b) return null;
  const placementParent = placementParentKindForBlock(template, id);
  const gridRef = useRef<HTMLTableElement | null>(null);
  /** content-max：每行内单元格统一高度（非全栅格共用一个最大值，避免行间视觉间距被撑开） */
  const [gridRowMaxHeights, setGridRowMaxHeights] = useState<number[] | null>(null);
  const gridRowHeightsRef = useRef<number[] | null>(null);
  const wsBase = wrapperStyleToCss(b.wrapperStyle);
  const placementCss = resolvePlacementToCss(b.wrapperStyle, placementParent);
  const leafHugWidthCss =
    b.type !== "emailRoot" && b.type !== "layout" && b.type !== "grid"
      ? wrapperHugWidthShrinkWrapCss(b.wrapperStyle?.widthMode)
      : {};
  const ws = { ...wsBase, ...placementCss, ...leafHugWidthCss };
  const selectBlock =
    (targetId: string | null): MouseEventHandler<HTMLElement> =>
    (e) => {
      // 预览中的按钮/图片/容器背景等链接只用于视觉还原，点击时命中区块选中，不跳转。
      const t = e.target;
      const el: Element | null =
        t instanceof Element ? t : t instanceof Text ? t.parentElement : null;
      if (el?.closest("a")) e.preventDefault();
      e.stopPropagation();
      onSelectBlock(targetId);
    };

  useLayoutEffect(() => {
    if (b.type !== "grid") return;
    const props = b.props as Record<string, unknown>;
    const cellHeightMode = props.cellHeightMode === "fixed" ? "fixed" : "content-max";
    if (cellHeightMode !== "content-max") {
      setGridRowMaxHeights(null);
      gridRowHeightsRef.current = null;
      return;
    }
    const host = gridRef.current;
    if (!host) return;

    let raf = 0;
    let stablePasses = 0;
    let ro: ResizeObserver | null = null;

    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const raw = measureGridRowContentMaxHeights(host);
        if (!raw.length) {
          setGridRowMaxHeights(null);
          gridRowHeightsRef.current = null;
          stablePasses = 0;
          return;
        }
        const stabilized = stabilizeGridRowHeights(raw, gridRowHeightsRef.current);
        const unchanged = gridRowHeightsStable(stabilized, gridRowHeightsRef.current ?? []);
        if (unchanged) {
          stablePasses += 1;
          if (stablePasses >= 2) ro?.disconnect();
          return;
        }
        stablePasses = 0;
        gridRowHeightsRef.current = stabilized;
        setGridRowMaxHeights(stabilized);
      });
    };

    measure();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(host);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [b]);

  if (b.type === "emailRoot") {
    const props = b.props;
    const outerBg = EMAIL_CANVAS_WORKSPACE_BACKGROUND;
    const innerBg = (props.backgroundColor as string) ?? "#ffffff";
    const rootW = props.width;
    const width =
      typeof rootW === "string" && rootW.trim() ? rootW.trim() : EMAIL_ROOT_FIXED_WIDTH;
    const rootBorderCss = borderToCss(props.border);
    const contentPadding = paddingToCss(props.padding);
    const rootGapMode = normalizeLayoutGapMode(props.gapMode);
    const rootGapFixed = (props.gap as string) ?? "0";
    const rootGapAuto = rootGapMode === "auto";
    const innerSel = selectionClassName(selectedBlockId, id, "email-root-inner");
    const rootBgImg = b.wrapperStyle?.backgroundImage;
    const hasRootBackgroundImage =
      rootBgImg && typeof rootBgImg.src === "string" && rootBgImg.src.trim().length > 0;
    const rootBackgroundWrapperStyle: WrapperStyle = {
      ...(b.wrapperStyle ?? {}),
      widthMode: "fixed",
      width,
      backgroundColor: innerBg,
    };
    const rootChildren = hasRootBackgroundImage
      ? renderWrapperBackgroundImagePreview({
          blockId: id,
          wrapperStyle: rootBackgroundWrapperStyle,
          childIds: b.children,
          layoutProps: props as LayoutBlockProps,
          template,
          selectedBlockId,
          onSelectBlock,
          placementParent,
          overlayPadding: props.padding,
          selectTargetId: null,
          selectionKind: "email-root-inner",
          outerStyle: {
            margin: "0 auto",
            ...rootBorderCss,
          },
        })
      : null;
    return (
      <div
        onClick={selectBlock(null)}
        style={{
          backgroundColor: outerBg,
          minHeight: "100%",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        {rootChildren ?? (
          <div
            className={innerSel}
            {...canvasPreviewBlockDataProps(id)}
            onClick={selectBlock(null)}
            style={{
              width,
              maxWidth: "100%",
              margin: "0 auto",
              backgroundColor: innerBg,
              padding: contentPadding ?? "0",
              ...rootBorderCss,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <table
              {...emailTablePresentationProps}
              style={{
                ...emailPresentationTableStyle,
                tableLayout: "fixed",
              }}
            >
              <tbody>
                {b.children.map((cid, idx) => (
                  <Fragment key={cid}>
                    {idx > 0 && !rootGapAuto && parseGapPx(rootGapFixed) > 0 ? (
                      <tr aria-hidden>
                        <td
                          style={{
                            ...tdBase(),
                            lineHeight: 0,
                            fontSize: 0,
                            height: rootGapFixed,
                          }}
                        >
                          <div style={{ height: rootGapFixed, width: "1px" }} />
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td style={{ ...tdBase(), verticalAlign: "top" }}>
                        <BlockView
                          id={cid}
                          template={template}
                          selectedBlockId={selectedBlockId}
                          onSelectBlock={onSelectBlock}
                        />
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const nodeSel = selectionClassName(selectedBlockId, id, "node");

  if (b.type === "layout") {
    const props = b.props;
    const gapMode = normalizeLayoutGapMode(props.gapMode);
    const gapFixed = (props.gap as string) ?? "8px";
    const gapAuto = gapMode === "auto";
    const direction = layoutFlexDirection(props.direction);
    const wrapperContentAlign = projectLayoutContentAlign(
      props.direction,
      b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined
    );
    const innerStackAlign = projectLayoutInnerStackContentAlign(props.direction);

    const bgImg = b.wrapperStyle?.backgroundImage;
    const hasContainerBg =
      bgImg && typeof bgImg.src === "string" && bgImg.src.trim().length > 0;

    if (hasContainerBg && bgImg) {
      return renderWrapperBackgroundImagePreview({
        blockId: id,
        wrapperStyle: b.wrapperStyle,
        childIds: b.children,
        layoutProps: props,
        template,
        selectedBlockId,
        onSelectBlock,
        placementParent,
      });
    }

    const isRow = direction === "row";
    const axisAlign = layoutContentAlignToFlex(
      direction,
      isRow ? wrapperContentAlign : innerStackAlign
    );
    const justifyContent =
      gapAuto && b.children.length > 1 ? "space-between" : axisAlign.justifyContent;
    const gapPx = parseGapPx(gapFixed);
    const renderedFixedGapPx = layoutRenderedFixedGapPx({ gapModeAuto: gapAuto, gapPx });
    const horizontalOuterAlign = tableAlignFromContentHorizontal(wrapperContentAlign?.horizontal);
    const verticalOuterValign = tableValignFromContentVertical(wrapperContentAlign?.vertical);
    const layoutOuterShellTableFullWidth = layoutPreviewOuterTableUsesFullWidth({
      widthMode: b.wrapperStyle?.widthMode,
      directionIsRow: isRow,
      gapModeAuto: gapAuto,
      childCount: b.children.length,
    });
    const layoutOuterDivFillParentHeight = layoutPreviewOuterBoxFillsParentHeight(
      b.wrapperStyle?.heightMode
    );
    const layoutInnerShellStretchHeight = layoutPreviewInnerShellStretchesHeight({
      heightMode: b.wrapperStyle?.heightMode,
      directionIsRow: isRow,
      gapModeAuto: gapAuto,
      childCount: b.children.length,
    });
    const rawLayoutWm = b.wrapperStyle?.widthMode;
    const layoutWidthModeNorm: "hug" | "fill" | "fixed" =
      rawLayoutWm === "hug" || rawLayoutWm === "fill" || rawLayoutWm === "fixed" ? rawLayoutWm : "fill";
    /** 栈格/单列内 `width:auto` 的块级仍会被 `td` 撑满行宽；hug 的 layout 收缩为内容宽，`placement` / 外层 `contentAlign` 语义才能与数据一致 */
    const layoutHugBoxShrinkWrap: CSSProperties =
      layoutWidthModeNorm === "hug" && !layoutOuterShellTableFullWidth
        ? { width: "fit-content", maxWidth: "100%" }
        : {};
    const fillColumnInnerHeight = resolveColumnInnerFillParentHeight(
      template,
      b.wrapperStyle,
      b.children,
      gapAuto
    );
    const fillRowInnerHeight = layoutRowInnerShouldFillParentHeight(b.wrapperStyle, b.children.length);
    const columnFillFlex = layoutColumnShouldUseFillFlex({
      wrapperStyle: b.wrapperStyle,
      hasFillHeightChild: columnHasFillHeightChild(template, b.children),
    });

    if (isRow) {
      const { innerTableStyle, childTdWidthStyle, omitSpacerGapCells } = horizontalRowInnerTableLayout(
        template,
        b.children,
        b.wrapperStyle,
        gapAuto,
        gapPx,
        fillRowInnerHeight
      );
      const innerTable = omitSpacerGapCells
        ? renderHorizontalRowFillFlex(
            template,
            b.children,
            renderedFixedGapPx,
            axisAlign.alignItems,
            selectedBlockId,
            onSelectBlock
          )
        : (
        <table
          {...emailTablePresentationProps}
          style={innerTableStyle}
        >
          <tbody style={fillRowInnerHeight ? { height: "100%" } : undefined}>
            <tr style={fillRowInnerHeight ? { height: "100%" } : undefined}>
              {b.children.flatMap((cid, idx) => {
                const cells: ReactElement[] = [];
                if (idx > 0 && !gapAuto && gapPx > 0 && !omitSpacerGapCells) {
                  cells.push(
                    <td
                      key={`sp-${cid}`}
                      style={{
                        ...tdBase(),
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
                const rowChildValign = crossVerticalAlignForTableRowChild(
                  template,
                  cid,
                  axisAlign.alignItems
                );
                cells.push(
                  <td
                    key={cid}
                    valign={rowChildValign}
                    style={{
                      ...tdBase(),
                      verticalAlign: rowChildValign,
                      ...childTdWidthStyle(cid),
                      ...(omitSpacerGapCells && idx < b.children.length - 1 && gapPx > 0
                        ? { paddingRight: gapPx }
                        : {}),
                      ...(fillRowInnerHeight ? { height: "100%" } : {}),
                    }}
                  >
                    <BlockView
                      id={cid}
                      template={template}
                      selectedBlockId={selectedBlockId}
                      onSelectBlock={onSelectBlock}
                    />
                  </td>
                );
                return cells;
              })}
            </tr>
          </tbody>
        </table>
        );

      return (
        <div
          className={nodeSel}
          {...canvasPreviewBlockDataProps(id)}
          onClick={selectBlock(id)}
          style={{
            ...ws,
            ...layoutHugBoxShrinkWrap,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <table
            {...emailTablePresentationProps}
            style={{
              borderCollapse: "collapse",
              borderSpacing: 0,
              width: layoutOuterShellTableFullWidth ? "100%" : "auto",
              maxWidth: "100%",
              tableLayout: layoutOuterShellTableFullWidth ? "fixed" : "auto",
              ...(fillRowInnerHeight ? { height: "100%" } : {}),
            }}
          >
            <tbody style={fillRowInnerHeight ? { height: "100%" } : undefined}>
              <tr style={fillRowInnerHeight ? { height: "100%" } : undefined}>
                <td
                  align={horizontalOuterAlign}
                  style={{
                    ...tdBase(),
                    ...(fillRowInnerHeight ? { height: "100%" } : {}),
                  }}
                >
                  {innerTable}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    const innerColumnTable = columnFillFlex
      ? renderVerticalColumnFillFlex(
          template,
          b.children,
          renderedFixedGapPx,
          axisAlign,
          selectedBlockId,
          onSelectBlock
        )
      : (
      <table
        {...emailTablePresentationProps}
        style={{
          ...emailPresentationTableStyle,
          width: layoutOuterShellTableFullWidth ? "100%" : "auto",
          tableLayout: layoutOuterShellTableFullWidth ? "fixed" : "auto",
          ...(fillColumnInnerHeight ? { height: "100%" } : {}),
        }}
      >
        <tbody style={fillColumnInnerHeight ? { height: "100%" } : undefined}>
          {b.children.map((cid, idx) => (
            <Fragment key={cid}>
              {idx > 0 && !gapAuto && parseGapPx(gapFixed) > 0 ? (
                <tr aria-hidden>
                  <td
                    align={crossHorizontalAlignAttrFromFlexAlignItems(axisAlign.alignItems)}
                    style={{
                      ...tdBase(),
                      lineHeight: 0,
                      fontSize: 0,
                      height: gapFixed,
                    }}
                  >
                    <div style={{ height: gapFixed, width: "1px" }} />
                  </td>
                </tr>
              ) : null}
              <tr style={fillColumnInnerHeight ? { height: "100%" } : undefined}>
                <td
                  align={stackCrossAxisAlignForTableStackChild(template, cid, axisAlign.alignItems)}
                  valign={stackMainAxisValignForTableStackChild(template, cid, justifyContent)}
                  style={{
                    ...tdBase(),
                    verticalAlign: stackMainAxisValignForTableStackChild(
                      template,
                      cid,
                      justifyContent
                    ),
                    ...(fillColumnInnerHeight ? { height: "100%" } : {}),
                  }}
                >
                  <BlockView
                    id={cid}
                    template={template}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={onSelectBlock}
                  />
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      );

    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{
          ...ws,
          ...layoutHugBoxShrinkWrap,
          overflow: "hidden",
          boxSizing: "border-box",
          ...(layoutOuterDivFillParentHeight ? { height: "100%" } : {}),
        }}
      >
        <table
          {...emailTablePresentationProps}
          style={{
            borderCollapse: "collapse",
            borderSpacing: 0,
            width: layoutOuterShellTableFullWidth ? "100%" : "auto",
            maxWidth: "100%",
            tableLayout: layoutOuterShellTableFullWidth ? "fixed" : "auto",
            ...(layoutInnerShellStretchHeight ? { height: "100%" } : {}),
          }}
        >
          <tbody style={layoutInnerShellStretchHeight ? { height: "100%" } : undefined}>
            <tr style={layoutInnerShellStretchHeight ? { height: "100%" } : undefined}>
              <td
                valign={verticalOuterValign}
                style={{
                  ...tdBase(),
                  ...(layoutInnerShellStretchHeight ? { height: "100%" } : {}),
                }}
              >
                {innerColumnTable}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (b.type === "text") {
    const props = b.props;
    const tb = props.textBody;
    const useBody = tb?.version === 1 && Array.isArray(tb.paragraphs);
    const html = renderTextBodyToHtml(tb, {
      bold: props.bold === true,
      italic: props.italic === true,
      decoration:
        props.decoration === "underline" ||
        props.decoration === "line-through" ||
        props.decoration === "overline" ||
        props.decoration === "none"
          ? props.decoration
          : "none",
    });
    const rawFontFamily = typeof props.fontFamily === "string" ? props.fontFamily : "";
    const fontFamily = rawFontFamily.trim()
      ? resolveRenderFontFamily(rawFontFamily)
      : DEFAULT_EMAIL_FONT_FAMILY;
    const fontSize = props.fontSize as string | undefined;
    const color = props.color as string | undefined;
    const bold = props.bold === true;
    const italic = props.italic === true;
    const decoration = props.decoration as CSSProperties["textDecoration"];
    const outerStyle: CSSProperties = {
      ...ws,
      ...contentAlignVerticalFlexCss(b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined),
      fontFamily,
      fontSize,
      lineHeight: FIXED_TEXT_LINE_HEIGHT,
      color,
      boxSizing: "border-box",
    };
    if (!useBody) {
      outerStyle.fontWeight = bold ? "700" : "400";
    }
    const innerStyle: CSSProperties = useBody
      ? {}
      : {
          fontStyle: italic ? "italic" : "normal",
          textDecoration:
            decoration === "underline" ||
            decoration === "line-through" ||
            decoration === "overline" ||
            decoration === "none"
              ? decoration
              : "none",
        };
    const onTextClick: MouseEventHandler<HTMLDivElement> = (e) => {
      const t = e.target;
      const el: Element | null =
        t instanceof Element ? t : t instanceof Text ? t.parentElement : null;
      const linkEl = el?.closest("a") as HTMLAnchorElement | null;
      if (linkEl) {
        e.preventDefault();
        e.stopPropagation();
        onSelectBlock(id);
        return;
      }
      selectBlock(id)(e);
    };
    return (
      <div className={nodeSel} {...canvasPreviewBlockDataProps(id)} onClick={onTextClick} style={outerStyle}>
        <div
          className="email-text-content"
          style={innerStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  if (b.type === "image") {
    const bgPreview = renderWrapperBackgroundImagePreview({
      blockId: id,
      wrapperStyle: b.wrapperStyle,
      childIds: b.children,
      layoutProps: b.props,
      template,
      selectedBlockId,
      onSelectBlock,
      placementParent,
    });
    if (bgPreview) return bgPreview;
    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{ ...ws, boxSizing: "border-box", color: "#999", fontSize: "12px" }}
      >
        图片块缺少 wrapperStyle.backgroundImage.src
      </div>
    );
  }

  if (b.type === "button") {
    const props = b.props;
    const text = (props.text as string) ?? "按钮";
    const link = (props.link as string) ?? "#";
    const bs = props.buttonStyle as Record<string, unknown> | undefined;
    const bg = (bs?.backgroundColor as string) ?? "#111";
    const tc = (bs?.textColor as string) ?? "#fff";
    const radiusCss = borderRadiusToCss(bs?.borderRadius);
    const pd = BUTTON_INNER_PADDING;
    const borderCss = borderToCss(bs?.border);
    const fw = bs?.bold === false ? 400 : 600;
    const fontStyle = bs?.italic === true ? "italic" : "normal";
    const buttonFontFamily = resolveRenderFontFamily(
      typeof bs?.fontFamily === "string" && bs.fontFamily.trim() ? bs.fontFamily : DEFAULT_EMAIL_FONT_FAMILY
    );
    const buttonFontSize = normalizeCssSize(bs?.fontSize) ?? "15px";
    const buttonBodyWidthCss = componentBodyWidthCss({
      mode: bs?.widthMode,
      width: bs?.width,
      defaultMode: "hug",
    });
    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{
          ...ws,
          ...contentAlignFlexCss(b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined),
          boxSizing: "border-box",
        }}
      >
        <a
          href={link}
          style={{
            ...buttonBodyWidthCss,
            boxSizing: "border-box",
            backgroundColor: bg,
            color: tc,
            ...radiusCss,
            padding: pd,
            textDecoration: "none",
            fontWeight: fw,
            fontStyle,
            fontFamily: buttonFontFamily,
            fontSize: buttonFontSize,
            textAlign: "center",
            ...borderCss,
          }}
          onClick={stopCanvasLinkNavigation}
          onAuxClick={stopCanvasLinkNavigation}
        >
          {text}
        </a>
      </div>
    );
  }

  if (b.type === "divider") {
    const props = b.props;
    const color = (props.color as string) ?? "#e0e0e0";
    const height = (props.height as string) ?? "1px";
    const lineWidthCss = componentBodyWidthCss({
      mode: props.lineWidthMode,
      width: props.lineWidth,
      defaultMode: "fill",
    });
    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{
          ...ws,
          ...contentAlignFlexCss(b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined),
          boxSizing: "border-box",
        }}
      >
        <hr style={{ ...lineWidthCss, border: "none", borderTop: `${height} solid ${color}`, margin: 0 }} />
      </div>
    );
  }

  if (b.type === "progress") {
    const props = b.props as Record<string, unknown>;
    const track = (props.trackColor as string) ?? "#E8DCC8";
    const fill = (props.fillColor as string) ?? "#C9A227";
    const rawVal = props.value;
    const rawMax = props.max;
    const valueNum = typeof rawVal === "number" && Number.isFinite(rawVal) ? rawVal : 0;
    const maxNum =
      typeof rawMax === "number" && Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
    const pct = Math.min(100, Math.max(0, (valueNum / maxNum) * 100));
    /** 与分割线 props.height 一致：条带厚度在 props，不占用外层容器 height */
    const barH =
      typeof props.barHeight === "string" && props.barHeight.trim()
        ? props.barHeight.trim()
        : "10px";
    const defaultBarRadius: BorderRadiusValue = { mode: "unified", radius: "9999px" };
    const barRadiusCss = borderRadiusToCss(props.barBorderRadius ?? defaultBarRadius);
    const barWidthCss = componentBodyWidthCss({
      mode: props.barWidthMode,
      width: props.barWidth,
      defaultMode: "fill",
    });
    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{
          ...ws,
          ...contentAlignFlexCss(b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined),
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            ...barWidthCss,
            display: "flex",
            height: barH,
            ...barRadiusCss,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              flexShrink: 0,
              height: "100%",
              backgroundColor: fill,
            }}
          />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              backgroundColor: track,
            }}
          />
        </div>
      </div>
    );
  }

  if (b.type === "grid") {
    const props = b.props;
    const cols = Number(props.columns ?? 2) || 2;
    const gapStr = (props.gap as string) ?? "12px";
    const gapPx = parseGapPx(gapStr);
    const cellWidthMode = props.cellWidthMode === "fixed" ? "fixed" : "auto";
    const cellFixedWidth = cellWidthMode === "fixed" ? normalizeCssSize(props.cellWidth) : undefined;
    const cellHeightMode = props.cellHeightMode === "fixed" ? "fixed" : "content-max";
    const gridTrackRowHeight =
      cellHeightMode === "fixed" ? normalizeCssSize(props.cellHeight) : undefined;

    const colWidthPct = cellFixedWidth ? undefined : cols > 0 ? `${(100 / cols).toFixed(4)}%` : undefined;
    /** 含列间 spacer 时，一行内 `<td>` 个数为 `cols + (cols-1)`；用于行间空隙行的 `colSpan` */
    const gridRowColSpan = gapPx > 0 ? Math.max(1, cols * 2 - 1) : cols;
    const rows: string[][] = [];
    const ch = b.children;
    for (let i = 0; i < ch.length; i += cols) {
      rows.push(ch.slice(i, i + cols));
    }

    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{
          ...ws,
          ...contentAlignFlexCss(b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined),
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <table
          ref={gridRef}
          {...emailTablePresentationProps}
          style={{
            ...emailPresentationTableStyle,
            ...(cellFixedWidth ? { width: "fit-content", maxWidth: "100%" } : {}),
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
        <tbody>
          {rows.map((row, ri) => (
            <Fragment key={`grid-row-group-${ri}`}>
              {ri > 0 && gapPx > 0 ? (
                <tr key={`grid-vgap-${ri}`} aria-hidden>
                  <td
                    colSpan={gridRowColSpan}
                    style={{
                      ...tdBase(),
                      height: gapPx,
                      maxHeight: gapPx,
                      lineHeight: 0,
                      fontSize: 0,
                      padding: 0,
                      border: 0,
                      verticalAlign: "top",
                    }}
                  >
                    &#8203;
                  </td>
                </tr>
              ) : null}
              <tr key={`grid-row-${ri}`}>
              {Array.from({ length: cols }, (_, ci) => {
                const rowUniformHeight =
                  cellHeightMode === "content-max" &&
                  gridRowMaxHeights?.[ri] != null &&
                  gridRowMaxHeights[ri]! > 0
                    ? `${gridRowMaxHeights[ri]}px`
                    : undefined;
                const cid = row[ci];
                return (
                  <Fragment key={`grid-cell-wrap-${ri}-${ci}`}>
                    {ci > 0 && gapPx > 0 ? (
                      <td
                        style={{
                          ...tdBase(),
                          width: gapPx,
                          minWidth: gapPx,
                          lineHeight: 0,
                          fontSize: 0,
                        }}
                        aria-hidden
                      >
                        <div style={{ width: gapPx, height: 1 }} />
                      </td>
                    ) : null}
                    {cid ? (
                      <td
                        className="email-preview-grid-slot"
                        style={{
                          ...tdBase(),
                          verticalAlign: "top",
                          ...(cellFixedWidth ? { width: cellFixedWidth } : colWidthPct ? { width: colWidthPct } : {}),
                          ...(rowUniformHeight ? { height: rowUniformHeight, minHeight: rowUniformHeight } : {}),
                          ...(gridTrackRowHeight && !rowUniformHeight
                            ? { height: gridTrackRowHeight }
                            : {}),
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        <BlockView
                          id={cid}
                          template={template}
                          selectedBlockId={selectedBlockId}
                          onSelectBlock={onSelectBlock}
                        />
                      </td>
                    ) : (
                      <td
                        style={{
                          ...tdBase(),
                          ...(colWidthPct ? { width: colWidthPct } : {}),
                        }}
                        aria-hidden
                      >
                        &nbsp;
                      </td>
                    )}
                  </Fragment>
                );
              })}
            </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    );
  }

  if (b.type === "icon") {
    const props = b.props;
    const iconSrc = resolveIconPreviewSrc(b);
    const size = (props.size as string) ?? "24px";
    const iconColor = resolveIconPreviewColor(b);
    const link = typeof props.link === "string" ? props.link.trim() : "";
    const iconNode = iconSrc ? (
      <IconGlyph src={iconSrc} size={size} color={iconColor} />
    ) : (
      <span style={{ fontSize: size }}>◇</span>
    );
    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id)}
        onClick={selectBlock(id)}
        style={{
          ...ws,
          ...contentAlignFlexCss(b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined),
          boxSizing: "border-box",
        }}
      >
        {link ? (
          <a
            href={link}
            style={{ display: "inline-block", lineHeight: 0, textDecoration: "none" }}
            onClick={stopCanvasLinkNavigation}
            onAuxClick={stopCanvasLinkNavigation}
          >
            {iconNode}
          </a>
        ) : (
          iconNode
        )}
      </div>
    );
  }

  return null;
}

/** 选中联动滚动画布见 `src/editor-canvas-contract`（`EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT: false`） */
export function EmailPreview({ template, selectedBlockId, onSelectBlock }: Props) {
  const rootBlockId = template.rootBlockId;
  const root = template.blocks[rootBlockId];
  if (!root) return <div>缺少根节点</div>;
  return (
    <div className="email-preview-scope">
      <BlockView
        id={rootBlockId}
        template={template}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
      />
    </div>
  );
}
