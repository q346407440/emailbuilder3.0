import type { CompactBlockKind } from "../compactTypes";
import {
  horizontalAlignFromSection,
  isOverlayImageNode,
  normalizeOverlayImageContentAlign,
  normalizeWrapperContentAlign,
  type HorizontalAlign,
} from "../applySectionContentAlign";
import { needsContentAlignPatch } from "../wrapperContentAlign";
import type { CompactNode, GroundingSection } from "../types";

export type CompactLayoutParentContext = {
  kind?: CompactBlockKind;
  widthMode?: "hug" | "fill" | "fixed";
  heightMode?: "hug" | "fill" | "fixed";
  direction?: "vertical" | "horizontal";
};

function layoutDirection(node: CompactNode): "vertical" | "horizontal" {
  const dir = node.props?.direction;
  return dir === "horizontal" ? "horizontal" : "vertical";
}

function isLayoutLike(kind: CompactBlockKind): boolean {
  return kind === "layout.container" || kind === "content.image";
}

function isChildWidthFillBlocked(parent: CompactLayoutParentContext | undefined): boolean {
  if (!parent?.kind || !isLayoutLike(parent.kind)) return false;
  return parent.widthMode === "hug";
}

function isChildHeightFillBlocked(parent: CompactLayoutParentContext | undefined): boolean {
  if (!parent?.kind || !isLayoutLike(parent.kind)) return false;
  const dir = parent.direction ?? "vertical";
  return dir === "vertical" && parent.heightMode === "hug";
}

function coerceBoxMode(
  raw: unknown,
  fallback: "hug" | "fill" | "fixed"
): "hug" | "fill" | "fixed" {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  if (raw === "fitContent") return "hug";
  return fallback;
}

function resolveOwnWidthMode(
  wrapper: CompactNode["wrapper"] | undefined,
  fallback: "hug" | "fill" | "fixed"
): "hug" | "fill" | "fixed" {
  return coerceBoxMode(wrapper?.widthMode, fallback);
}

function resolveOwnHeightMode(
  wrapper: CompactNode["wrapper"] | undefined,
  fallback: "hug" | "fill" | "fixed"
): "hug" | "fill" | "fixed" {
  return coerceBoxMode(wrapper?.heightMode, fallback);
}

function patchWrapperContentAlign(
  wrapper: CompactNode["wrapper"] | undefined,
  section: GroundingSection,
  parentHorizontal: HorizontalAlign | undefined,
  node: CompactNode
): CompactNode["wrapper"] {
  if (!needsContentAlignPatch(wrapper)) {
    return wrapper ?? {};
  }
  const sectionAlign = horizontalAlignFromSection(section);
  const horizontalFallback = parentHorizontal ?? sectionAlign;
  const contentAlign = isOverlayImageNode(node)
    ? normalizeOverlayImageContentAlign(wrapper?.contentAlign, horizontalFallback)
    : normalizeWrapperContentAlign(wrapper?.contentAlign, horizontalFallback);
  return {
    ...(wrapper ?? {}),
    contentAlign,
  };
}

/** D-LAYOUT-2/3 + D-ALIGN-1：在 IR 层闭合 hug/fill 与 contentAlign。 */
function isLayoutAlignParentKind(kind: CompactNode["kind"]): boolean {
  return (
    kind === "layout.container" ||
    kind === "layout.grid" ||
    kind === "content.image"
  );
}

function resolvedNodeHorizontal(
  wrapper: CompactNode["wrapper"] | undefined,
  horizontalFallback: HorizontalAlign
): HorizontalAlign {
  return normalizeWrapperContentAlign(wrapper?.contentAlign, horizontalFallback).horizontal;
}

export function applyCompactLayoutConstraints(
  root: CompactNode,
  section: GroundingSection
): CompactNode {
  const sectionAlign = horizontalAlignFromSection(section);

  const walk = (
    node: CompactNode,
    parent: CompactLayoutParentContext | undefined,
    isSectionRoot: boolean,
    parentHorizontal: HorizontalAlign | undefined
  ): CompactNode => {
    let wrapper = node.wrapper;
    const horizontalFallback = parentHorizontal ?? sectionAlign;

    if (
      node.kind === "layout.container" ||
      node.kind === "content.text" ||
      node.kind === "action.button" ||
      node.kind === "content.image" ||
      node.kind === "layout.grid"
    ) {
      wrapper = patchWrapperContentAlign(
        wrapper,
        section,
        isSectionRoot ? undefined : parentHorizontal,
        node
      );
    }

    const widthFallback = isSectionRoot ? "fill" : "fill";
    const heightFallback = "hug";
    let widthMode = resolveOwnWidthMode(wrapper, widthFallback);
    let heightMode = resolveOwnHeightMode(wrapper, heightFallback);

    if (isChildWidthFillBlocked(parent) && widthMode === "fill") {
      widthMode = "hug";
    }
    if (isChildHeightFillBlocked(parent) && heightMode === "fill") {
      heightMode = "hug";
    }

    wrapper = { ...(wrapper ?? {}), widthMode, heightMode };

    const next: CompactNode = {
      ...node,
      ...(wrapper ? { wrapper } : {}),
    };

    const parentCtx: CompactLayoutParentContext = {
      kind: node.kind,
      widthMode,
      heightMode,
      direction: isLayoutLike(node.kind) ? layoutDirection(node) : undefined,
    };

    const alignForChildren = isLayoutAlignParentKind(node.kind)
      ? resolvedNodeHorizontal(
          wrapper,
          isSectionRoot ? sectionAlign : horizontalFallback
        )
      : parentHorizontal;

    if (node.children?.length) {
      next.children = node.children.map((child) =>
        walk(child, parentCtx, false, alignForChildren)
      );
    }

    return next;
  };

  return walk(root, undefined, true, undefined);
}
