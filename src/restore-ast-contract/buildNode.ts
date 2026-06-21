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
import {
  applyBoxWrapper,
  applyUniformNestedBorderRadius,
  mapImageOverlayAlign,
  mapRowAlign,
  mapStackAlign,
  resolveRowGapMode,
  resolveButtonStyleWidthMode,
  resolveIconSizePx,
  resolveRadius,
  resolveRole,
  resolveSpace,
  resolveTone,
} from "./resolveValue";
import { deriveBlockDisplayName, type DisplayNameHints } from "./deriveBlockDisplayName";
import { deriveRowInlineImageBox } from "./rowInlineImageBox";
import { resolveButtonTextColor } from "./resolveButtonTextColor";
import { resolveButtonWrapperContentAlign, resolveTextContentAlign } from "./textContentAlign";
import {
  GRID_MAX_COLUMNS,
  GRID_MIN_COLUMNS,
  PROGRESS_MAX,
  PROGRESS_MIN,
  type AlignCross,
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
      widthMode: "fill",
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
  inDirectImageOverlay?: boolean;
  imageOverlayAlign?: AlignCross;
  imageOverlayCrossAlign?: AlignCross;
  /** 当前 grid 作用域内的统一商品图高度；undefined = 未声明，各 image 自管 height。 */
  gridCellImageHeight?: number;
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
      inDirectImageOverlay: options?.inDirectImageOverlay,
      imageOverlayAlign: options?.imageOverlayAlign,
      imageOverlayCrossAlign: options?.imageOverlayCrossAlign,
      gridCellImageHeight: options?.gridCellImageHeight,
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

export type BuildNodeParentContext = {
  /** 当前节点位于横排 layout.container 内（影响 text 等叶子宽度）。 */
  inHorizontalRow?: boolean;
  /** 直接父节点为 stack（text 继承其 horizontal align）。 */
  inDirectStack?: boolean;
  stackAlign?: AlignCross;
  /** 直接父节点为带叠放 children 的 image（text 继承 overlay align）。 */
  inDirectImageOverlay?: boolean;
  imageOverlayAlign?: AlignCross;
  imageOverlayCrossAlign?: AlignCross;
  /** 祖先 grid 声明了 cellImageHeight 时，格内 image 统一用此 px（忽略 image.height）。 */
  gridCellImageHeight?: number;
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

  const bg = resolveTone("props.backgroundColor", "surface");
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
  const shell = containerShell(id, "vertical", {
    gap,
    contentAlign: mapStackAlign(node.align),
    box: node.box,
  });

  return {
    id,
    type: "layout",
    blockMeta: blockMetaFor("layout", displayName(node, ctx, hints)),
    ...shell,
    children: buildChildren(node.children, ctx, astPath, {
      inDirectStack: true,
      stackAlign: node.align,
      gridCellImageHeight: parent.gridCellImageHeight,
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
  const shell = containerShell(id, "horizontal", {
    gap,
    gapMode: resolveRowGapMode(node.align),
    contentAlign: mapRowAlign(node.align, node.crossAlign),
    box: node.box,
  });

  return {
    id,
    type: "layout",
    blockMeta: blockMetaFor("layout", displayName(node, ctx, hints)),
    ...shell,
    children: buildChildren(node.children, ctx, astPath, {
      inHorizontalRow: true,
      gridCellImageHeight: parent.gridCellImageHeight,
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
  const widthMode = parent.inHorizontalRow ? ("hug" as const) : ("fill" as const);

  return {
    id,
    type: "text",
    blockMeta: blockMetaFor("text", displayName(node, ctx, hints)),
    props: {
      textBody: {
        paragraphs: [{ runs: [{ text: node.content, ...(node.bold ? { bold: true } : {}) }] }],
      },
      fontSize: fontSize.value,
      color: color.value,
      bold: node.bold ?? false,
      italic: node.italic ?? false,
      decoration: "none",
    },
    wrapperStyle: {
      contentAlign: resolveTextContentAlign(parent, node.align),
      widthMode,
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
  const boxApplied = applyBoxWrapper("wrapperStyle", node.box);
  const rowInline = parent.inHorizontalRow ? deriveRowInlineImageBox(heightPx, node.aspect) : null;

  ctx.assets.push({
    blockId: id,
    kind: "image",
    query: node.query,
    targetWidth: rowInline?.widthPx ?? 600,
    required: node.required ?? false,
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
      widthMode: rowInline ? "fixed" : "fill",
      ...(rowInline ? { width: `${rowInline.widthPx}px` } : {}),
      heightMode: "fixed",
      height: `${rowInline?.heightPx ?? heightPx}px`,
      border: borderNone(),
      borderRadius: borderRadiusZero(),
      backgroundImage: {
        src: "#",
        fit: "cover",
        position: "center",
      },
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
    required: node.required ?? false,
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

  const bg = node.tone
    ? resolveTone("props.buttonStyle.backgroundColor", node.tone)
    : resolveTone("props.buttonStyle.backgroundColor", "primary");
  const preferredText = resolveTone("props.buttonStyle.textColor", "surface");
  const textColor = resolveButtonTextColor(
    "props.buttonStyle.textColor",
    bg,
    preferredText,
    ctx.theme
  );
  const fontSize = resolveRole("props.buttonStyle.fontSize", "body");
  const borderRadiusApplied = node.radius
    ? applyUniformNestedBorderRadius("props.buttonStyle.borderRadius", node.radius)
    : applyUniformNestedBorderRadius("props.buttonStyle.borderRadius", undefined, "cta");
  const buttonStyleWidthMode = resolveButtonStyleWidthMode(node.width);

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
        border: borderNone(),
        bold: false,
        italic: false,
        widthMode: buttonStyleWidthMode,
      },
    },
    wrapperStyle: {
      contentAlign: resolveButtonWrapperContentAlign(parent),
      widthMode: "fill",
      heightMode: "hug",
      border: borderNone(),
      borderRadius: borderRadiusZero(),
    },
    bindings: mergeBindings(
      bg.bindings,
      textColor.bindings,
      fontSize.bindings,
      borderRadiusApplied.bindings
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
