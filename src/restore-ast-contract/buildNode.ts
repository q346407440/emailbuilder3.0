import { inferSemanticBlockTypeForMeta } from "../block-contract/types";
import type { BindingSpec } from "../types/email";
import type { EmailBlock } from "../types/email";
import {
  borderNone,
  borderRadiusZero,
  DEFAULT_CONTENT_ALIGN,
  mergeBindings,
  paddingZero,
} from "./buildPrimitives";
import type { BuildCtx } from "./buildCtx";
import { resolveEmailCanvasBackground } from "./resolveEmailCanvas";
import {
  applyBoxWrapper,
  applyImageBoxWrapper,
  IMAGE_WRAPPER_BACKGROUND_COLOR,
  applyUniformNestedBorderRadius,
  mapImageOverlayAlign,
  mapRowAlign,
  mapStackAlign,
  resolveRowGapMode,
  rowMainAlignToCross,
  resolveBoxBorder,
  resolveButtonStyleHeight,
  resolveButtonStyleWidthMode,
  resolveIconSizePx,
  resolveRadius,
  resolveRole,
  resolveSpace,
  resolveTone,
} from "./resolveValue";
import { deriveBlockDisplayName, type DisplayNameHints } from "./deriveBlockDisplayName";
import {
  deriveRowInlineImageBox,
  shouldDeriveFixedImageBoxFromAspect,
} from "./rowInlineImageBox";
import { resolveButtonTextColor } from "./resolveButtonTextColor";
import { splitTextContentToParagraphs } from "./splitTextContentToParagraphs";
import {
  isContentPanelStack,
  resolveDirectRowChildWrapperWidthMode,
  resolveLeafWrapperWidthMode,
  resolveStackWrapperWidthMode,
  resolveVerticalStackChildLayoutWidthMode,
} from "./resolveRowChildWidthMode";
import { resolveButtonWrapperContentAlign, resolveTextContentAlign } from "./textContentAlign";
import {
  GRID_MAX_COLUMNS,
  GRID_MIN_COLUMNS,
  PROGRESS_MAX,
  PROGRESS_MIN,
  type AlignCross,
  type AlignMain,
  type RestoreNode,
} from "./types";

/** 组装阶段草稿块（含嵌套 children，落盘前展平为 EditorBlockGraph）。 */
export type DraftBlock = {
  id: string;
  type: EmailBlock["type"];
  blockMeta: { blockType: string; name: string };
  props: Record<string, unknown>;
  wrapperStyle?: EmailBlock["wrapperStyle"];
  bindings?: Record<string, BindingSpec>;
  children?: DraftBlock[];
};

function blockMetaFor(type: EmailBlock["type"], name: string): { blockType: string; name: string } {
  return {
    blockType: inferSemanticBlockTypeForMeta(type) ?? type,
    name,
  };
}

function displayName(node: RestoreNode, ctx: BuildCtx, hints: DisplayNameHints): string {
  void ctx;
  return deriveBlockDisplayName(node, hints);
}

function containerShell(
  id: string,
  direction: "vertical" | "horizontal",
  opts: {
    gap?: ReturnType<typeof resolveSpace>;
    gapMode?: "fixed" | "auto";
    contentAlign: { horizontal: string; vertical: string };
    box?: import("./types").Box;
    widthMode?: "fill" | "hug";
    extraBindings?: Record<string, BindingSpec>;
  }
): Pick<DraftBlock, "wrapperStyle" | "bindings" | "props"> {
  const gap = opts.gap ?? resolveSpace("props.gap", undefined, "gap");
  const gapMode = opts.gapMode ?? "fixed";
  const boxApplied = applyBoxWrapper("wrapperStyle", opts.box);

  return {
    props: {
      direction,
      gapMode,
      gap: gap.value,
    },
    wrapperStyle: {
      widthMode: opts.widthMode ?? "fill",
      heightMode: "hug",
      contentAlign: opts.contentAlign,
      border: borderNone(),
      borderRadius: borderRadiusZero(),
      ...boxApplied.wrapperExtras,
    },
    bindings: mergeBindings(gap.bindings, boxApplied.bindings, opts.extraBindings),
  };
}

type BuildChildrenOptions = {
  fromEmail?: boolean;
  inHorizontalRow?: boolean;
  inDirectStack?: boolean;
  stackAlign?: AlignCross;
  inDirectRow?: boolean;
  rowAlign?: AlignMain;
  inDirectImageOverlay?: boolean;
  imageOverlayAlign?: AlignCross;
  imageOverlayCrossAlign?: AlignCross;
  /** 当前 grid 作用域内的统一商品图高度；undefined = 未声明，各 image 自管 height。 */
  gridCellImageHeight?: number;
  /** 直接父 layout 为 hug 宽（纵排徽章列等）。 */
  parentWidthHug?: boolean;
  /** 祖先为内容面板 stack（卡片壳）。 */
  inContentPanelStack?: boolean;
};

function buildChildren(
  nodes: RestoreNode[],
  ctx: BuildCtx,
  parentPath: string,
  options?: BuildChildrenOptions
): DraftBlock[] {
  return nodes.map((node, index) => {
    const hints: DisplayNameHints = {};
    if (options?.fromEmail && node.t === "stack") {
      hints.isEmailDirectStack = true;
    }
    return buildNode(node, ctx, `${parentPath}.children[${index}]`, hints, {
      inHorizontalRow: options?.inHorizontalRow,
      inDirectStack: options?.inDirectStack,
      stackAlign: options?.stackAlign,
      inDirectRow: options?.inDirectRow,
      rowAlign: options?.rowAlign,
      inDirectImageOverlay: options?.inDirectImageOverlay,
      imageOverlayAlign: options?.imageOverlayAlign,
      imageOverlayCrossAlign: options?.imageOverlayCrossAlign,
      gridCellImageHeight: options?.gridCellImageHeight,
      parentWidthHug: options?.parentWidthHug,
      inContentPanelStack: options?.inContentPanelStack,
      rowSiblings: options?.inDirectRow ? nodes : undefined,
      rowSiblingIndex: options?.inDirectRow ? index : undefined,
    });
  });
}

function resolveImageHeightPx(
  node: Extract<RestoreNode, { t: "image" }>,
  parent: BuildNodeParentContext
): number {
  if (parent.gridCellImageHeight != null) {
    return parent.gridCellImageHeight;
  }
  return node.height?.px ?? 240;
}

/** 子 stack 未写 align 时，继承直接父 stack 或父 row 的主轴对齐。 */
function inheritStackAlign(
  align: AlignCross | undefined,
  parent: BuildNodeParentContext
): AlignCross | undefined {
  if (align !== undefined) return align;
  if (parent.inDirectStack && parent.stackAlign !== undefined) return parent.stackAlign;
  if (parent.inDirectRow && parent.rowAlign !== undefined) {
    return rowMainAlignToCross(parent.rowAlign);
  }
  return undefined;
}

/** 子 row 未写 align 时，继承直接父 stack 或父 row 的主轴对齐。 */
function inheritRowAlign(
  align: AlignMain | undefined,
  parent: BuildNodeParentContext
): AlignMain | undefined {
  if (align !== undefined) return align;
  if (parent.inDirectStack && parent.stackAlign !== undefined) {
    return parent.stackAlign as AlignMain;
  }
  if (parent.inDirectRow && parent.rowAlign !== undefined) return parent.rowAlign;
  return undefined;
}

export type BuildNodeParentContext = {
  /** 当前节点位于横排 layout.container 内（影响 text 等叶子宽度）。 */
  inHorizontalRow?: boolean;
  /** 直接父节点为 stack（text 继承其 horizontal align）。 */
  inDirectStack?: boolean;
  stackAlign?: AlignCross;
  /** 直接父节点为 row（text / 子 stack 继承其主轴 align）。 */
  inDirectRow?: boolean;
  rowAlign?: AlignMain;
  /** 直接父节点为带叠放 children 的 image（text 继承 overlay align）。 */
  inDirectImageOverlay?: boolean;
  imageOverlayAlign?: AlignCross;
  imageOverlayCrossAlign?: AlignCross;
  /** 祖先 grid 声明了 cellImageHeight 时，格内 image 统一用此 px（忽略 image.height）。 */
  gridCellImageHeight?: number;
  /** 直接父 layout 宽度为 hug 时，定高 image 须写出 fixed 宽避免协调层 fill→hug 塌宽。 */
  parentWidthHug?: boolean;
  /** 祖先为内容面板 stack（卡片壳）；内文须在栏宽内 fill 换行。 */
  inContentPanelStack?: boolean;
  /** 横排兄弟节点（仅 inDirectRow 时传入）。 */
  rowSiblings?: readonly RestoreNode[];
  rowSiblingIndex?: number;
};

export function buildNode(
  node: RestoreNode,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints = {},
  parent: BuildNodeParentContext = {}
): DraftBlock {
  switch (node.t) {
    case "email":
      return buildEmail(node, ctx, astPath, hints);
    case "stack":
      return buildStack(node, ctx, astPath, hints, parent);
    case "row":
      return buildRow(node, ctx, astPath, hints, parent);
    case "grid":
      return buildGrid(node, ctx, astPath, hints, parent);
    case "text":
      return buildText(node, ctx, astPath, hints, parent);
    case "image":
      return buildImage(node, ctx, astPath, hints, parent);
    case "icon":
      return buildIcon(node, ctx, astPath, hints);
    case "button":
      return buildButton(node, ctx, astPath, hints, parent);
    case "divider":
      return buildDivider(node, ctx, astPath, hints);
    case "progress":
      return buildProgress(node, ctx, astPath, hints);
    default: {
      const _exhaustive: never = node;
      throw new Error(`未知 AST 节点：${JSON.stringify(_exhaustive)}`);
    }
  }
}

function buildEmail(
  node: Extract<RestoreNode, { t: "email" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints
): DraftBlock {
  const id = ctx.nextId("root");
  ctx.recordAstPath(id, astPath);

  const bg = resolveEmailCanvasBackground(node);
  const children = buildChildren(node.children, ctx, astPath, { fromEmail: true });

  return {
    id,
    type: "emailRoot",
    blockMeta: blockMetaFor("emailRoot", displayName(node, ctx, hints)),
    props: {
      backgroundColor: bg.value,
      width: "600px",
      padding: paddingZero(),
      gapMode: "fixed",
      gap: "0",
      border: borderNone(),
    },
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
    },
    bindings: bg.bindings,
    children,
  };
}

function buildStack(
  node: Extract<RestoreNode, { t: "stack" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints,
  parent: BuildNodeParentContext
): DraftBlock {
  const id = ctx.nextId("stack");
  ctx.recordAstPath(id, astPath);
  const gap = node.gap ? resolveSpace("props.gap", node.gap) : resolveSpace("props.gap", undefined, "gap");
  const effectiveAlign = inheritStackAlign(node.align, parent);
  const stackAlign = mapStackAlign(effectiveAlign);
  const stackWidthMode = resolveStackWrapperWidthMode(node, parent);
  const inContentPanel = parent.inContentPanelStack || isContentPanelStack(node);
  const shell = containerShell(id, "vertical", {
    gap,
    contentAlign: parent.inDirectRow
      ? { horizontal: stackAlign.horizontal, vertical: "center" }
      : stackAlign,
    box: node.box,
    widthMode: stackWidthMode,
  });

  return {
    id,
    type: "layout",
    blockMeta: blockMetaFor("layout", displayName(node, ctx, hints)),
    ...shell,
    children: buildChildren(node.children, ctx, astPath, {
      inDirectStack: true,
      stackAlign: effectiveAlign,
      gridCellImageHeight: parent.gridCellImageHeight,
      parentWidthHug: stackWidthMode === "hug",
      inContentPanelStack: inContentPanel,
    }),
  };
}

function buildRow(
  node: Extract<RestoreNode, { t: "row" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints,
  parent: BuildNodeParentContext
): DraftBlock {
  const id = ctx.nextId("row");
  ctx.recordAstPath(id, astPath);
  const gap = node.gap ? resolveSpace("props.gap", node.gap) : resolveSpace("props.gap", undefined, "gap");
  const effectiveAlign = inheritRowAlign(node.align, parent);
  const shell = containerShell(id, "horizontal", {
    gap,
    gapMode: resolveRowGapMode(effectiveAlign),
    contentAlign: mapRowAlign(effectiveAlign, node.crossAlign),
    box: node.box,
    widthMode: resolveVerticalStackChildLayoutWidthMode(parent),
  });

  return {
    id,
    type: "layout",
    blockMeta: blockMetaFor("layout", displayName(node, ctx, hints)),
    ...shell,
    children: buildChildren(node.children, ctx, astPath, {
      inHorizontalRow: true,
      inDirectRow: true,
      rowAlign: effectiveAlign,
      gridCellImageHeight: parent.gridCellImageHeight,
      inContentPanelStack: parent.inContentPanelStack,
    }),
  };
}

function buildGrid(
  node: Extract<RestoreNode, { t: "grid" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints,
  _parent: BuildNodeParentContext
): DraftBlock {
  const id = ctx.nextId("grid");
  ctx.recordAstPath(id, astPath);
  const columns = Math.min(GRID_MAX_COLUMNS, Math.max(GRID_MIN_COLUMNS, node.columns));
  const gap = node.gap ? resolveSpace("props.gap", node.gap) : resolveSpace("props.gap", undefined, "gap");
  const boxApplied = applyBoxWrapper("wrapperStyle", node.box);

  const children = buildChildren(node.children, ctx, astPath, {
    gridCellImageHeight: node.cellImageHeight?.px,
  });

  return {
    id,
    type: "grid",
    blockMeta: blockMetaFor("grid", displayName(node, ctx, hints)),
    props: {
      columns,
      gap: gap.value,
      cellWidthMode: "auto",
      cellHeightMode: "content-max",
    },
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: DEFAULT_CONTENT_ALIGN,
      border: borderNone(),
      borderRadius: borderRadiusZero(),
      padding: paddingZero(),
      ...boxApplied.wrapperExtras,
    },
    bindings: mergeBindings(gap.bindings, boxApplied.bindings),
    children,
  };
}

function buildText(
  node: Extract<RestoreNode, { t: "text" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints,
  parent: BuildNodeParentContext
): DraftBlock {
  const id = ctx.nextId("text");
  ctx.recordAstPath(id, astPath);
  const fontSize = resolveRole("props.fontSize", node.role);
  const color = resolveTone("props.color", node.tone);
  const runBold = node.bold ?? false;

  return {
    id,
    type: "text",
    blockMeta: blockMetaFor("text", displayName(node, ctx, hints)),
    props: {
      textBody: {
        paragraphs: splitTextContentToParagraphs(node.content, {
          bold: runBold ? true : undefined,
        }),
      },
      fontSize: fontSize.value,
      color: color.value,
      bold: runBold,
      italic: node.italic ?? false,
      decoration: "none",
    },
    wrapperStyle: {
      contentAlign: resolveTextContentAlign(parent, node.align),
      widthMode: resolveLeafWrapperWidthMode(parent),
      heightMode: "hug",
      border: borderNone(),
      borderRadius: borderRadiusZero(),
    },
    bindings: mergeBindings(fontSize.bindings, color.bindings),
  };
}

function buildImage(
  node: Extract<RestoreNode, { t: "image" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints,
  parent: BuildNodeParentContext
): DraftBlock {
  const id = ctx.nextId("image");
  ctx.recordAstPath(id, astPath);
  const heightPx = resolveImageHeightPx(node, parent);
  const boxApplied = applyImageBoxWrapper("wrapperStyle", node.box);
  const aspectFixedBox = shouldDeriveFixedImageBoxFromAspect(parent, node)
    ? deriveRowInlineImageBox(heightPx, node.aspect)
    : null;

  ctx.assets.push({
    blockId: id,
    kind: "image",
    query: node.query,
    targetWidth: aspectFixedBox?.widthPx ?? 600,
  });

  const hasOverlay = node.children != null && node.children.length > 0;
  const overlayContentAlign = hasOverlay
    ? mapImageOverlayAlign(node.align, node.crossAlign)
    : DEFAULT_CONTENT_ALIGN;
  const overlayChildren = hasOverlay
    ? buildChildren(node.children!, ctx, astPath, {
        inDirectImageOverlay: true,
        imageOverlayAlign: node.align,
        imageOverlayCrossAlign: node.crossAlign,
        gridCellImageHeight: parent.gridCellImageHeight,
      })
    : undefined;

  return {
    id,
    type: "image",
    blockMeta: blockMetaFor("image", displayName(node, ctx, hints)),
    ...(overlayChildren
      ? {
          props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
        }
      : { props: {} }),
    wrapperStyle: {
      contentAlign: overlayContentAlign,
      widthMode: aspectFixedBox ? "fixed" : "fill",
      ...(aspectFixedBox ? { width: `${aspectFixedBox.widthPx}px` } : {}),
      heightMode: "fixed",
      height: `${aspectFixedBox?.heightPx ?? heightPx}px`,
      border: borderNone(),
      borderRadius: borderRadiusZero(),
      backgroundImage: {
        src: "#",
        fit: "cover",
        position: "center",
      },
      backgroundColor: IMAGE_WRAPPER_BACKGROUND_COLOR,
      ...boxApplied.wrapperExtras,
    },
    bindings: boxApplied.bindings,
    children: overlayChildren,
  };
}

function buildIcon(
  node: Extract<RestoreNode, { t: "icon" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints
): DraftBlock {
  const id = ctx.nextId("icon");
  ctx.recordAstPath(id, astPath);
  const color = resolveTone("props.color", node.tone, "#000000");

  ctx.assets.push({
    blockId: id,
    kind: "icon",
    query: node.query,
    pack: node.pack,
  });

  return {
    id,
    type: "icon",
    blockMeta: blockMetaFor("icon", displayName(node, ctx, hints)),
    props: {
      src: "",
      size: resolveIconSizePx(node.size),
      color: color.value,
    },
    wrapperStyle: {
      contentAlign: DEFAULT_CONTENT_ALIGN,
      widthMode: "hug",
      heightMode: "hug",
      border: borderNone(),
      borderRadius: borderRadiusZero(),
    },
    bindings: color.bindings,
  };
}

function buildButton(
  node: Extract<RestoreNode, { t: "button" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints,
  parent: BuildNodeParentContext
): DraftBlock {
  const id = ctx.nextId("btn");
  ctx.recordAstPath(id, astPath);

  const fontSize = resolveRole("props.buttonStyle.fontSize", "body");
  const borderRadiusApplied = node.radius
    ? applyUniformNestedBorderRadius("props.buttonStyle.borderRadius", node.radius)
    : applyUniformNestedBorderRadius("props.buttonStyle.borderRadius", undefined, "cta");
  const buttonStyleWidthMode = resolveButtonStyleWidthMode(node.width);
  const buttonStyleHeight = resolveButtonStyleHeight(node.height);

  const isOutline = node.border !== undefined;
  const bg = isOutline
    ? resolveTone("props.buttonStyle.backgroundColor", "surface")
    : node.tone
      ? resolveTone("props.buttonStyle.backgroundColor", node.tone)
      : resolveTone("props.buttonStyle.backgroundColor", "primary");
  const preferredText = isOutline
    ? resolveTone(
        "props.buttonStyle.textColor",
        node.borderTone ?? node.tone ?? "primary"
      )
    : resolveTone("props.buttonStyle.textColor", "surface");
  const textColor = resolveButtonTextColor(
    "props.buttonStyle.textColor",
    bg,
    preferredText,
    ctx.theme
  );
  const borderApplied = isOutline
    ? resolveBoxBorder(
        "props.buttonStyle.border",
        node.border!,
        node.borderTone ?? node.tone
      )
    : { border: borderNone(), bindings: undefined };

  return {
    id,
    type: "button",
    blockMeta: blockMetaFor("button", displayName(node, ctx, hints)),
    props: {
      text: node.label,
      link: { href: node.href ?? "#", type: "external" },
      buttonStyle: {
        backgroundColor: bg.value,
        textColor: textColor.value,
        fontSize: fontSize.value,
        borderRadius: borderRadiusApplied.borderRadius,
        border: borderApplied.border,
        bold: false,
        italic: false,
        widthMode: buttonStyleWidthMode,
        heightMode: buttonStyleHeight.heightMode,
        ...(buttonStyleHeight.heightPx ? { height: buttonStyleHeight.heightPx } : {}),
      },
    },
    wrapperStyle: {
      contentAlign: resolveButtonWrapperContentAlign(parent),
      widthMode: resolveDirectRowChildWrapperWidthMode(parent, {
        forceFill: node.width === "fill",
      }),
      heightMode: "hug",
      border: borderNone(),
      borderRadius: borderRadiusZero(),
    },
    bindings: mergeBindings(
      bg.bindings,
      textColor.bindings,
      fontSize.bindings,
      borderRadiusApplied.bindings,
      borderApplied.bindings
    ),
  };
}

function buildDivider(
  node: Extract<RestoreNode, { t: "divider" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints
): DraftBlock {
  const id = ctx.nextId("divider");
  ctx.recordAstPath(id, astPath);
  const color = resolveTone("props.color", node.tone, "#D8D8D8");
  const lineHeight = node.thickness === "thin" ? "2px" : "1px";

  return {
    id,
    type: "divider",
    blockMeta: blockMetaFor("divider", displayName(node, ctx, hints)),
    props: {
      color: color.value,
      height: lineHeight,
      lineWidthMode: "fill",
    },
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: DEFAULT_CONTENT_ALIGN,
      border: borderNone(),
      borderRadius: borderRadiusZero(),
    },
    bindings: color.bindings,
  };
}

function buildProgress(
  node: Extract<RestoreNode, { t: "progress" }>,
  ctx: BuildCtx,
  astPath: string,
  hints: DisplayNameHints
): DraftBlock {
  const id = ctx.nextId("progress");
  ctx.recordAstPath(id, astPath);
  const value = Math.min(PROGRESS_MAX, Math.max(PROGRESS_MIN, node.value));
  const trackColor = resolveTone("props.trackColor", "secondary");
  const fillColor = resolveTone("props.fillColor", "primary");
  const barRadius = applyUniformNestedBorderRadius("props.barBorderRadius", undefined, "panel");

  return {
    id,
    type: "progress",
    blockMeta: blockMetaFor("progress", displayName(node, ctx, hints)),
    props: {
      value,
      max: 100,
      trackColor: trackColor.value,
      fillColor: fillColor.value,
      barWidthMode: "fill",
      barHeight: "10px",
      barBorderRadius: barRadius.borderRadius,
    },
    wrapperStyle: {
      contentAlign: DEFAULT_CONTENT_ALIGN,
      widthMode: "fill",
      heightMode: "hug",
      border: borderNone(),
      borderRadius: borderRadiusZero(),
    },
    bindings: mergeBindings(trackColor.bindings, fillColor.bindings, barRadius.bindings),
  };
}
