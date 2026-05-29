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
import { EMAIL_CANVAS_TEXT_FONT_FAMILY } from "../render-defaults-contract/values";
import {
  emailPresentationTableStyle,
  layoutColumnInnerShouldFillParentHeight,
  layoutPreviewOuterTableUsesFullWidth,
  layoutPreviewOuterBoxFillsParentHeight,
  layoutPreviewInnerShellStretchesHeight,
  layoutRowChildTdWidthAttr,
  layoutRowChildTdWidthStyle,
  layoutRowInnerShouldFillParentHeight,
  layoutRowInnerShouldUseFixedTableLayout,
  layoutRowInnerShouldUseFullWidth,
  layoutRowInnerTablePresentationStyle,
  layoutRowOmitsSpacerGapCells,
  layoutRenderedFixedGapPx,
  layoutStackCrossAlignForChild,
  layoutStackMainValignForChild,
  parseGapPx,
  tableAlignFromContentHorizontal,
  tableValignFromContentVertical,
  wrapperHugWidthShrinkWrapCss,
} from "../lib/emailTableLayout";
import {
  gridMatrixSlotContentAlignCss,
  layoutPreviewHugOuterShellBoxStyle,
} from "../lib/emailPresentationLayout";
import { normalizeWrapperContentAlign } from "../lib/wrapperContentAlign";
import { sourceBlockIdFromRepeatClone } from "../lib/repeatRegion";
import {
  FIXED_TEXT_LINE_HEIGHT,
  projectLayoutContentAlign,
} from "../render-defaults-contract/values";
import {
  borderRadiusToCss,
  borderToCss,
  paddingToCss,
  wrapperStyleToCss,
} from "../lib/wrapperStyleToCss";
import { renderTextBodyToHtml } from "../lib/textBodyFormat";
import { normalizeCssLengthPx } from "../lib/wrapperBackgroundImage";
import {
  renderWrapperBackgroundImageCanvasShell,
} from "../lib/wrapperBackgroundImageCanvas";
import { resolveWrapperBackgroundImageCanvasLayout } from "../lib/wrapperBackgroundImageCanvasLayout";
import {
  computeGridRowHeightsWithFillStretch,
  gridDataRowUsesFillStretch,
  gridMatrixHasFillStretchRow,
  gridRowHeightsStable,
  measureGridRowContentMaxHeights,
  stabilizeGridRowHeights,
} from "../lib/gridContentMaxHeight";
import { deliveryExportBoxModeDataAttrs } from "../render-defaults-contract/deliveryExport";
import { emailPresentationHugSlotAntiStrutStyle } from "../lib/emailPresentationLayout";
import {
  emailPresentationTableProps,
  emailPresentationTdBase,
  renderPresentationLeafShell,
  renderProgressBarTable,
  flatMapHorizontalLayoutRowCells,
  renderVerticalStackInnerTable,
} from "../lib/emailPresentationPrimitives";

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

/** 与 {@link emailPresentationTableProps} 同义，保留本地别名减少 diff 噪声 */
const emailTablePresentationProps = emailPresentationTableProps;

function tdBase(): CSSProperties {
  return emailPresentationTdBase();
}

function slotAlignFromWrapperContentAlign(
  contentAlign: WrapperContentAlign | undefined
): { align: "left" | "center" | "right"; valign: ReturnType<typeof tableValignFromContentVertical> } {
  const ca = normalizeWrapperContentAlign(contentAlign);
  return {
    align: tableAlignFromContentHorizontal(ca.horizontal),
    valign: tableValignFromContentVertical(ca.vertical),
  };
}

function layoutChildSlotAlign(
  parentDirection: "vertical" | "horizontal",
  parentContentAlign: WrapperContentAlign | undefined
): { align: "left" | "center" | "right"; valign: ReturnType<typeof tableValignFromContentVertical> } {
  return {
    align: layoutStackCrossAlignForChild(parentDirection, parentContentAlign),
    valign: layoutStackMainValignForChild(parentDirection, parentContentAlign),
  };
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

/** 画布滚动定位锚点（与左侧 `data-block-tree-row` 成对）+ 发信导出盒模式标记 */
function canvasPreviewBlockDataProps(
  blockId: string,
  wrapperStyle?: WrapperStyle | null
): Record<string, string> {
  return {
    ...deliveryExportBoxModeDataAttrs(wrapperStyle),
    "data-email-preview-block": sourceBlockIdFromRepeatClone(blockId),
  };
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
  childTdWidthAttr: (childId: string) => string | undefined;
  omitSpacerGapCells: boolean;
} {
  const childCount = childIds.length;
  const hasFillWidthChild = childIds.some((cid) => {
    const child = template.blocks[cid];
    return (child?.wrapperStyle?.widthMode ?? "fill") === "fill";
  });
  const hasHugWidthChild = childIds.some((cid) => {
    const child = template.blocks[cid];
    return (child?.wrapperStyle?.widthMode ?? "fill") === "hug";
  });
  const rowLayoutWidthParams = {
    parentWidthMode: parentWrapperStyle?.widthMode,
    gapModeAuto: gapAuto,
    childCount,
    hasFillWidthChild,
    hasHugWidthChild,
  };
  const innerTableFullWidth = layoutRowInnerShouldUseFullWidth(rowLayoutWidthParams);
  const innerTableUsesFixedLayout = layoutRowInnerShouldUseFixedTableLayout(rowLayoutWidthParams);
  const innerTableStyle = layoutRowInnerTablePresentationStyle({
    ...rowLayoutWidthParams,
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
      innerTableUsesFixedLayout,
      gapModeAuto: gapAuto,
      childCount,
      rowHasFillWidthChild: hasFillWidthChild,
      rowHasHugWidthChild: hasHugWidthChild,
    });
  };
  const childTdWidthAttr = (childId: string): string | undefined => {
    const child = template.blocks[childId];
    return layoutRowChildTdWidthAttr(child?.wrapperStyle?.widthMode, { innerTableFullWidth });
  };
  return { innerTableStyle, childTdWidthStyle, childTdWidthAttr, omitSpacerGapCells };
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
  const gapPx = layoutRenderedFixedGapPx({ gapModeAuto: gapAuto, gapPx: parseGapPx(gapFixed) });
  const direction = layoutFlexDirection(layoutProps?.direction ?? "vertical");
  const isRow = direction === "row";
  const rowStackAlign = projectLayoutContentAlign(
    layoutProps?.direction,
    contentAlign as WrapperContentAlign | undefined
  );
  const fillColumnInnerHeight = resolveColumnInnerFillParentHeight(
    template,
    wrapperStyle,
    childIds,
    gapAuto
  );
  const fillRowInnerHeight = layoutRowInnerShouldFillParentHeight(wrapperStyle, childIds.length);

  if (isRow) {
    const { innerTableStyle, childTdWidthStyle, childTdWidthAttr, omitSpacerGapCells } = horizontalRowInnerTableLayout(
      template,
      childIds,
      wrapperStyle,
      gapAuto,
      gapPx,
      fillRowInnerHeight
    );
    return (
      <table
        {...emailTablePresentationProps}
        style={innerTableStyle}
      >
        <tbody style={fillRowInnerHeight ? { height: "100%" } : undefined}>
          <tr style={fillRowInnerHeight ? { height: "100%" } : undefined}>
            {flatMapHorizontalLayoutRowCells({
              template,
              childIds,
              gapAuto,
              gapPx,
              omitSpacerGapCells,
              childTdWidthStyle,
              childTdWidthAttr,
              fillRowInnerHeight,
              slotAlign: layoutChildSlotAlign("horizontal", rowStackAlign),
              renderChild: (cid) => (
                <BlockView
                  id={cid}
                  template={template}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={onSelectBlock}
                />
              ),
            })}
          </tr>
        </tbody>
      </table>
    );
  }

  return renderVerticalStackInnerTable({
    template,
    childIds,
    gapAuto,
    gapFixed,
    gapPx,
    stretchColumn: fillColumnInnerHeight,
    tableWidthFull: true,
    stackCrossAlign: () =>
      layoutStackCrossAlignForChild("vertical", rowStackAlign),
    stackMainValign: () =>
      layoutStackMainValignForChild("vertical", rowStackAlign),
    parentCrossFallback: undefined,
    parentMainFallback: undefined,
    renderChild: (cid) => (
      <BlockView
        id={cid}
        template={template}
        selectedBlockId={selectedBlockId}
        onSelectBlock={onSelectBlock}
      />
    ),
  });
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
  overlayPadding?: unknown;
  selectTargetId?: string | null;
  selectionKind?: "node" | "email-root-inner";
  outerStyle?: CSSProperties;
  enableHugIntrinsicHeight?: boolean;
}): ReactElement | null {
  const {
    blockId,
    wrapperStyle,
    childIds,
    layoutProps,
    template,
    selectedBlockId,
    onSelectBlock,
    overlayPadding,
    selectionKind = "node",
    outerStyle,
    enableHugIntrinsicHeight,
  } = opts;
  const selectTargetId: string | null =
    opts.selectTargetId === null ? null : opts.selectTargetId ?? blockId;
  const layout = resolveWrapperBackgroundImageCanvasLayout({
    wrapperStyle,
    layoutDirection: layoutProps?.direction === "horizontal" ? "horizontal" : "vertical",
    overlayPadding,
    outerStyle,
    enableHugIntrinsicHeight,
  });
  if (!layout) return null;

  const wrapperContentAlign = projectLayoutContentAlign(
    layoutProps?.direction,
    wrapperStyle?.contentAlign as WrapperContentAlign | undefined
  );

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

  return renderWrapperBackgroundImageCanvasShell({
    layout,
    className: nodeSel,
    dataProps: canvasPreviewBlockDataProps(blockId, wrapperStyle),
    onClick: selectBlock(selectTargetId),
    onLinkNavigate: stopCanvasLinkNavigation,
    children: renderBackgroundImageOverlayChildren({
      childIds,
      layoutProps,
      wrapperStyle,
      contentAlign: wrapperContentAlign,
      template,
      selectedBlockId,
      onSelectBlock,
    }),
  });
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
  const gridRef = useRef<HTMLTableElement | null>(null);
  /** content-max：每行内单元格统一高度（非全栅格共用一个最大值，避免行间视觉间距被撑开） */
  const [gridRowMaxHeights, setGridRowMaxHeights] = useState<number[] | null>(null);
  const gridRowHeightsRef = useRef<number[] | null>(null);
  const wsBase = wrapperStyleToCss(b.wrapperStyle);
  const leafHugWidthCss =
    b.type !== "emailRoot" && b.type !== "layout" && b.type !== "grid"
      ? wrapperHugWidthShrinkWrapCss(b.wrapperStyle?.widthMode)
      : {};
  const ws = { ...wsBase, ...leafHugWidthCss };
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

    const cols = Number(props.columns ?? 2) || 2;
    const gridRows: string[][] = [];
    for (let i = 0; i < b.children.length; i += cols) {
      gridRows.push(b.children.slice(i, i + cols));
    }
    const gapPx = parseGapPx((props.gap as string) ?? "12px");
    const rowsUseFillStretch = gridRows.map((row) =>
      gridDataRowUsesFillStretch(template, row, b.wrapperStyle, cellHeightMode)
    );
    const matrixFillStretch = rowsUseFillStretch.some(Boolean);

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
        const withFillStretch =
          matrixFillStretch && host.clientHeight > 0
            ? computeGridRowHeightsWithFillStretch({
                hostClientHeight: host.clientHeight,
                measuredContentHeights: raw,
                rowsUseFillStretch,
                verticalGapPx: gapPx,
              })
            : raw;
        const stabilized = stabilizeGridRowHeights(withFillStretch, gridRowHeightsRef.current);
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
  }, [b, template]);

  if (b.type === "emailRoot") {
    const props = b.props;
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
          overlayPadding: props.padding,
          selectTargetId: null,
          selectionKind: "email-root-inner",
          outerStyle: {
            margin: "0 auto",
            ...rootBorderCss,
          },
        })
      : null;
    if (rootChildren) {
      return rootChildren;
    }

    return (
      <div
        className={innerSel}
        {...canvasPreviewBlockDataProps(id, b.wrapperStyle)}
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
                  <td
                    style={{
                      ...tdBase(),
                      verticalAlign: "top",
                      ...emailPresentationHugSlotAntiStrutStyle(
                        template.blocks[cid]?.wrapperStyle?.heightMode
                      ),
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
      });
    }

    const isRow = direction === "row";
    const layoutSlotAlign = slotAlignFromWrapperContentAlign(wrapperContentAlign);
    const gapPx = layoutRenderedFixedGapPx({ gapModeAuto: gapAuto, gapPx: parseGapPx(gapFixed) });
    const hasFillWidthChild = isRow
      ? b.children.some((cid) => (template.blocks[cid]?.wrapperStyle?.widthMode ?? "fill") === "fill")
      : false;
    const horizontalOuterAlign = tableAlignFromContentHorizontal(wrapperContentAlign?.horizontal);
    const verticalOuterValign = tableValignFromContentVertical(wrapperContentAlign?.vertical);
    const layoutOuterShellTableFullWidth = layoutPreviewOuterTableUsesFullWidth({
      widthMode: b.wrapperStyle?.widthMode,
      directionIsRow: isRow,
      gapModeAuto: gapAuto,
      hasFillWidthChild,
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
    const layoutOuterBoxCss = layoutPreviewHugOuterShellBoxStyle(ws, {
      widthMode: b.wrapperStyle?.widthMode,
      outerShellTableFullWidth: layoutOuterShellTableFullWidth,
    });
    const fillColumnInnerHeight = resolveColumnInnerFillParentHeight(
      template,
      b.wrapperStyle,
      b.children,
      gapAuto
    );
    const fillRowInnerHeight = layoutRowInnerShouldFillParentHeight(b.wrapperStyle, b.children.length);

    if (isRow) {
      const { innerTableStyle, childTdWidthStyle, childTdWidthAttr, omitSpacerGapCells } = horizontalRowInnerTableLayout(
        template,
        b.children,
        b.wrapperStyle,
        gapAuto,
        gapPx,
        fillRowInnerHeight
      );
      const innerTable = (
        <table
          {...emailTablePresentationProps}
          style={innerTableStyle}
        >
          <tbody style={fillRowInnerHeight ? { height: "100%" } : undefined}>
            <tr style={fillRowInnerHeight ? { height: "100%" } : undefined}>
              {flatMapHorizontalLayoutRowCells({
                template,
                childIds: b.children,
                gapAuto,
                gapPx,
                omitSpacerGapCells,
                childTdWidthStyle,
                childTdWidthAttr,
                fillRowInnerHeight,
                slotAlign: layoutChildSlotAlign("horizontal", wrapperContentAlign),
                renderChild: (cid) => (
                  <BlockView
                    id={cid}
                    template={template}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={onSelectBlock}
                  />
                ),
              })}
            </tr>
          </tbody>
        </table>
      );

      return (
        <div
          className={nodeSel}
          {...canvasPreviewBlockDataProps(id, b.wrapperStyle)}
          onClick={selectBlock(id)}
          style={{
            ...layoutOuterBoxCss,
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

    const innerColumnTable = renderVerticalStackInnerTable({
      template,
      childIds: b.children,
      gapAuto,
      gapFixed,
      gapPx,
      stretchColumn: fillColumnInnerHeight,
      tableWidthFull: layoutOuterShellTableFullWidth,
      stackCrossAlign: () =>
        layoutStackCrossAlignForChild("vertical", wrapperContentAlign),
      stackMainValign: () =>
        layoutStackMainValignForChild("vertical", wrapperContentAlign),
      parentCrossFallback: undefined,
      parentMainFallback: undefined,
      renderChild: (cid) => (
        <BlockView
          id={cid}
          template={template}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
        />
      ),
    });

    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id, b.wrapperStyle)}
        onClick={selectBlock(id)}
        style={{
          ...layoutOuterBoxCss,
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
                align={horizontalOuterAlign}
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
    const useBody = tb && typeof tb === "object" && Array.isArray(tb.paragraphs);
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
      color: typeof props.color === "string" ? props.color : undefined,
      fontSize: typeof props.fontSize === "string" ? props.fontSize : undefined,
    });
    const fontFamily = EMAIL_CANVAS_TEXT_FONT_FAMILY;
    const fontSize = props.fontSize as string | undefined;
    const color = props.color as string | undefined;
    const bold = props.bold === true;
    const italic = props.italic === true;
    const decoration = props.decoration as CSSProperties["textDecoration"];
    const outerBoxCss: CSSProperties = {
      ...ws,
      fontFamily,
      fontSize,
      lineHeight: FIXED_TEXT_LINE_HEIGHT,
      color,
    };
    if (!useBody) {
      outerBoxCss.fontWeight = bold ? "700" : "400";
    }
    const textTypography: CSSProperties = {
      fontFamily,
      ...(fontSize ? { fontSize } : {}),
      lineHeight: FIXED_TEXT_LINE_HEIGHT,
      ...(color ? { color } : {}),
    };
    const innerStyle: CSSProperties = useBody
      ? textTypography
      : {
          ...textTypography,
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
    return renderPresentationLeafShell({
      className: nodeSel,
      dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
      onClick: onTextClick,
      wrapperStyle: b.wrapperStyle,
      outerBoxCss,
      contentAlign: b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined,
      children: (
        <div
          className="email-text-content"
          style={innerStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ),
    });
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
      enableHugIntrinsicHeight: true,
    });
    if (bgPreview) return bgPreview;
    return (
      <div
        className={nodeSel}
        {...canvasPreviewBlockDataProps(id, b.wrapperStyle)}
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
    const buttonFontFamily = EMAIL_CANVAS_TEXT_FONT_FAMILY;
    const buttonFontSize = normalizeCssSize(bs?.fontSize) ?? "15px";
    const buttonBodyWidthCss = componentBodyWidthCss({
      mode: bs?.widthMode,
      width: bs?.width,
      defaultMode: "hug",
    });
    return renderPresentationLeafShell({
      className: nodeSel,
      dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
      onClick: selectBlock(id),
      wrapperStyle: b.wrapperStyle,
      outerBoxCss: ws,
      contentAlign: b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined,
      children: (
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
      ),
    });
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
    return renderPresentationLeafShell({
      className: nodeSel,
      dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
      onClick: selectBlock(id),
      wrapperStyle: b.wrapperStyle,
      outerBoxCss: ws,
      contentAlign: b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined,
      children: (
        <hr style={{ ...lineWidthCss, border: "none", borderTop: `${height} solid ${color}`, margin: 0 }} />
      ),
    });
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
    return renderPresentationLeafShell({
      className: nodeSel,
      dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
      onClick: selectBlock(id),
      wrapperStyle: b.wrapperStyle,
      outerBoxCss: ws,
      contentAlign: b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined,
      children: renderProgressBarTable({
        barWidthCss,
        barHeight: barH,
        fillColor: fill,
        trackColor: track,
        percent: pct,
        radiusCss: barRadiusCss,
      }),
    });
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

    const rowsUseFillStretch = rows.map((row) =>
      gridDataRowUsesFillStretch(template, row, b.wrapperStyle, cellHeightMode)
    );
    const matrixFillStretch = gridMatrixHasFillStretchRow(
      template,
      rows,
      b.wrapperStyle,
      cellHeightMode
    );

    const gridSlotContentAlign = b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined;

    const gridTable = (
      <table
        ref={gridRef}
        {...emailTablePresentationProps}
        style={{
          ...emailPresentationTableStyle,
          ...(cellFixedWidth ? { width: "auto", maxWidth: "100%" } : {}),
          ...(matrixFillStretch ? { height: "100%" } : {}),
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
              <tr
                key={`grid-row-${ri}`}
                style={
                  rowsUseFillStretch[ri] && matrixFillStretch && !gridRowMaxHeights?.[ri]
                    ? { height: "100%" }
                    : undefined
                }
              >
              {Array.from({ length: cols }, (_, ci) => {
                const rowUniformHeight =
                  cellHeightMode === "content-max" &&
                  gridRowMaxHeights?.[ri] != null &&
                  gridRowMaxHeights[ri]! > 0
                    ? `${gridRowMaxHeights[ri]}px`
                    : undefined;
                const rowFillStretch = rowsUseFillStretch[ri] && matrixFillStretch;
                const cid = row[ci];
                const slotContentAlign = gridSlotContentAlign;
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
                          ...gridMatrixSlotContentAlignCss(slotContentAlign),
                          ...emailPresentationHugSlotAntiStrutStyle(
                            template.blocks[cid]?.wrapperStyle?.heightMode
                          ),
                          ...(cellFixedWidth ? { width: cellFixedWidth } : colWidthPct ? { width: colWidthPct } : {}),
                          ...(rowUniformHeight ? { height: rowUniformHeight, minHeight: rowUniformHeight } : {}),
                          ...(rowFillStretch && !rowUniformHeight ? { height: "100%" } : {}),
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
    );

    const gridBgLayout = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: b.wrapperStyle,
      layoutDirection: undefined,
    });

    if (gridBgLayout) {
      return renderWrapperBackgroundImageCanvasShell({
        layout: gridBgLayout,
        className: nodeSel,
        dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
        onClick: selectBlock(id),
        onLinkNavigate: stopCanvasLinkNavigation,
        children: gridTable,
      });
    }

    return renderPresentationLeafShell({
      className: nodeSel,
      dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
      onClick: selectBlock(id),
      wrapperStyle: b.wrapperStyle,
      outerBoxCss: { ...ws, overflow: "hidden" },
      contentAlign: b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined,
      children: gridTable,
    });
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
    return renderPresentationLeafShell({
      className: nodeSel,
      dataProps: canvasPreviewBlockDataProps(id, b.wrapperStyle),
      onClick: selectBlock(id),
      wrapperStyle: b.wrapperStyle,
      outerBoxCss: ws,
      contentAlign: b.wrapperStyle?.contentAlign as WrapperContentAlign | undefined,
      children: link ? (
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
      ),
    });
  }

  return null;
}

/** 选中联动滚动画布见 `src/editor-canvas-contract`（`EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT: false`） */
export function EmailPreview({ template, selectedBlockId, onSelectBlock }: Props) {
  const rootBlockId = template.rootBlockId;
  const root = template.blocks[rootBlockId];
  if (!root) return <div>缺少根节点</div>;
  return (
    <div
      className="email-preview-canvas-workspace"
      style={{
        backgroundColor: EMAIL_CANVAS_WORKSPACE_BACKGROUND,
        minHeight: "100%",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div className="email-preview-scope">
        <BlockView
          id={rootBlockId}
          template={template}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectBlock}
        />
      </div>
    </div>
  );
}
