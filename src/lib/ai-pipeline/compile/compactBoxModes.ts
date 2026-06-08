import type { CompactBlockKind } from "../compactTypes";
import { listImageSlots } from "../groundingImage";
import type { ImageWrapperGridContext } from "../imageWrapperDefaults";
import type { CompactNode, GroundingSection } from "../types";
import {
  applyImageContainerPresetToWrapper,
  resolveImageContainerPreset,
} from "./imageContainerPresets";

export type CompactBoxModeContext = {
  section: GroundingSection;
  isIconRow?: boolean;
  parentWidthMode?: "hug" | "fill" | "fixed";
  parentHeightMode?: "hug" | "fill" | "fixed";
  /** 父 layout.container 的 direction；缺省 vertical。 */
  parentLayoutDirection?: "vertical" | "horizontal";
  parentGrid?: ImageWrapperGridContext;
};

function layoutContainerDirection(node: CompactNode): "vertical" | "horizontal" {
  return node.props?.direction === "horizontal" ? "horizontal" : "vertical";
}

function parentGridFromNode(node: CompactNode): ImageWrapperGridContext | undefined {
  if (node.kind !== "layout.grid") return undefined;
  const props = applyCompactGridProps(node).props ?? {};
  const cellHeightMode = props.cellHeightMode === "fixed" ? "fixed" : "content-max";
  const raw = props.cellHeight;
  const cellHeight =
    cellHeightMode === "fixed" && typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
  return { cellHeightMode, ...(cellHeight ? { cellHeight } : {}) };
}

/** D：grid 缺省 cellHeightMode=content-max（与 blockDefaults 一致）；仅 fixed 时保留 cellHeight。 */
export function applyCompactGridProps(node: CompactNode): CompactNode {
  if (node.kind !== "layout.grid") return node;
  const props = { ...(node.props ?? {}) };
  const cellHeightMode = props.cellHeightMode === "fixed" ? "fixed" : "content-max";
  props.cellHeightMode = cellHeightMode;
  if (cellHeightMode === "content-max") {
    delete props.cellHeight;
  } else {
    const raw = props.cellHeight;
    props.cellHeight =
      typeof raw === "string" && raw.trim() ? raw.trim() : "120px";
  }
  return { ...node, props };
}

function isIconRowLayout(node: CompactNode): boolean {
  if (node.kind !== "layout.container") return false;
  const children = node.children ?? [];
  return children.length > 0 && children.every((c) => c.kind === "content.icon");
}

function defaultBoxModes(
  kind: CompactBlockKind,
  ctx: CompactBoxModeContext
): { widthMode: "fill" | "hug" | "fixed"; heightMode: "fill" | "hug" | "fixed" } {
  switch (kind) {
    case "layout.container":
      if (ctx.isIconRow) {
        return { widthMode: "hug", heightMode: "hug" };
      }
      return { widthMode: "fill", heightMode: "hug" };
    case "layout.grid":
      return { widthMode: "fill", heightMode: "hug" };
    case "content.text":
      return {
        widthMode: ctx.parentLayoutDirection === "horizontal" ? "hug" : "fill",
        heightMode: "hug",
      };
    case "content.icon":
      return { widthMode: "hug", heightMode: "hug" };
    case "action.button":
      return { widthMode: "hug", heightMode: "hug" };
    case "content.divider":
      return { widthMode: "fill", heightMode: "hug" };
    default:
      return { widthMode: "fill", heightMode: "hug" };
  }
}

function slotForImageRef(section: GroundingSection, ref: string | undefined) {
  if (!ref) return undefined;
  return listImageSlots(section).find((s) => s.slotId === ref);
}

function applyImageWrapperFromPreset(
  node: CompactNode,
  section: GroundingSection,
  gridCtx?: ImageWrapperGridContext
): CompactNode {
  const ref = node.wrapper?.backgroundImageRef;
  const slot = slotForImageRef(section, ref);
  const preset = resolveImageContainerPreset({
    role: slot?.role,
    layoutTier: slot?.layoutTier,
    containerHeight: slot?.containerHeight,
    gridCtx,
    cardImageTier: section.layoutHints?.cardImageTier,
    sectionHasOverlay: section.hasOverlay,
  });
  return {
    ...node,
    wrapper: applyImageContainerPresetToWrapper(node.wrapper, preset),
  };
}

function applyBoxModeDefaults(
  kind: CompactBlockKind,
  node: CompactNode,
  ctx: CompactBoxModeContext
): CompactNode {
  if (kind === "content.image") {
    return applyImageWrapperFromPreset(node, ctx.section, ctx.parentGrid);
  }

  const wrapper = { ...(node.wrapper ?? {}) };
  const defaults = defaultBoxModes(kind, ctx);

  if (!wrapper.widthMode || !wrapper.heightMode) {
    const widthBlocked = ctx.parentWidthMode === "hug";
    wrapper.widthMode = wrapper.widthMode ?? (widthBlocked ? "hug" : defaults.widthMode);
    wrapper.heightMode = wrapper.heightMode ?? defaults.heightMode;
  }

  return { ...node, wrapper };
}

function resolveCompactWidthMode(
  wrapper: CompactNode["wrapper"] | undefined,
  ctx: CompactBoxModeContext
): "hug" | "fill" | "fixed" | undefined {
  const mode = wrapper?.widthMode;
  if (mode === "hug" || mode === "fill" || mode === "fixed") return mode;
  if (ctx.isIconRow) return "hug";
  return undefined;
}

function resolveCompactHeightMode(
  wrapper: CompactNode["wrapper"] | undefined
): "hug" | "fill" | "fixed" | undefined {
  const mode = wrapper?.heightMode;
  if (mode === "hug" || mode === "fill" || mode === "fixed") return mode;
  return undefined;
}

function isIconRowChild(child: CompactNode, parent: CompactNode): boolean {
  return parent.kind === "layout.container" && child.kind === "content.icon";
}

/** D-BOX-1/2：盒模型缺省 + 图片 role 预设。 */
export function applyCompactBoxModes(
  node: CompactNode,
  ctx: CompactBoxModeContext
): CompactNode | null {
  if (!node?.kind) return null;

  const withGridProps = applyCompactGridProps(node);
  const withDefaults = applyBoxModeDefaults(withGridProps.kind, withGridProps, ctx);
  const children: CompactNode[] = [];
  const gridForChildren = parentGridFromNode(withDefaults) ?? ctx.parentGrid;
  const parentWidthMode = resolveCompactWidthMode(withDefaults.wrapper, ctx);
  const parentHeightMode = resolveCompactHeightMode(withDefaults.wrapper);

  const iconRow =
    ctx.isIconRow || (withDefaults.kind === "layout.container" && isIconRowLayout(withDefaults));

  const childParentDirection =
    withDefaults.kind === "layout.container"
      ? layoutContainerDirection(withDefaults)
      : ctx.parentLayoutDirection ?? "vertical";

  for (const child of withDefaults.children ?? []) {
    const n = applyCompactBoxModes(child, {
      ...ctx,
      isIconRow: iconRow || isIconRowChild(child, withDefaults),
      parentGrid: gridForChildren,
      parentWidthMode,
      parentHeightMode,
      parentLayoutDirection: childParentDirection,
    });
    if (n) children.push(n);
  }

  return { ...withDefaults, children: children.length ? children : undefined };
}

export function applyCompactBoxModesToSection(
  root: CompactNode,
  section: GroundingSection
): CompactNode | null {
  const isIconRow = section.assetHints?.primaryAsset === "content-icon";
  return applyCompactBoxModes(root, { section, isIconRow });
}
