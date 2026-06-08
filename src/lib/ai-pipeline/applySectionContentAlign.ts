import type { CompactNode, GroundingSection } from "./types";
import {
  mergeContentAlignPreservingExplicit,
  type HorizontalAlign,
  type VerticalAlign,
} from "./wrapperContentAlign";

export type { HorizontalAlign } from "./wrapperContentAlign";

const DEFAULT_SECTION_ALIGN: HorizontalAlign = "center";
const OVERLAY_IMAGE_DEFAULT_VERTICAL: VerticalAlign = "center";

/** content.image 且含叠放子块（icon/text/button 等）。 */
export function isOverlayImageNode(node: Pick<CompactNode, "kind" | "children">): boolean {
  return node.kind === "content.image" && (node.children?.length ?? 0) > 0;
}

/** 合并 partial contentAlign 与默认值，保证 horizontal / vertical 均合法。 */
export function normalizeWrapperContentAlign(
  partial?: { horizontal?: string; vertical?: string } | null,
  horizontalFallback: HorizontalAlign = DEFAULT_SECTION_ALIGN
): { horizontal: HorizontalAlign; vertical: VerticalAlign } {
  return mergeContentAlignPreservingExplicit(partial, horizontalFallback, {
    overlayImage: false,
  });
}

/** 底图 + children 叠放：vertical 缺省为 center（社交格 / hero 叠字等）。 */
export function normalizeOverlayImageContentAlign(
  partial?: { horizontal?: string; vertical?: string } | null,
  horizontalFallback: HorizontalAlign = DEFAULT_SECTION_ALIGN
): { horizontal: HorizontalAlign; vertical: VerticalAlign } {
  return mergeContentAlignPreservingExplicit(partial, horizontalFallback, {
    overlayImage: true,
  });
}

export function resolveWrapperContentAlignForNode(
  node: CompactNode,
  horizontalFallback: HorizontalAlign
): { horizontal: HorizontalAlign; vertical: VerticalAlign } {
  if (isOverlayImageNode(node)) {
    return normalizeOverlayImageContentAlign(node.wrapper?.contentAlign, horizontalFallback);
  }
  return normalizeWrapperContentAlign(node.wrapper?.contentAlign, horizontalFallback);
}

/** 从 Stage A layoutHints.align 解析水平对齐；缺省与 emailbuilder BASE_WRAPPER 一致为 center。 */
export function horizontalAlignFromSection(section: GroundingSection): HorizontalAlign {
  const raw = section.layoutHints?.align;
  if (raw === "left" || raw === "center" || raw === "right") return raw;
  return DEFAULT_SECTION_ALIGN;
}

function isLayoutAlignParent(kind: CompactNode["kind"]): boolean {
  return (
    kind === "layout.container" ||
    kind === "layout.grid" ||
    kind === "content.image"
  );
}

function isIconRowLayout(node: CompactNode): boolean {
  if (node.kind !== "layout.container") return false;
  const children = node.children ?? [];
  return children.length > 0 && children.every((c) => c.kind === "content.icon");
}

function resolveWidthMode(
  wrapper: CompactNode["wrapper"] | undefined,
  fallback?: "hug" | "fill" | "fixed"
): "hug" | "fill" | "fixed" | undefined {
  const mode = wrapper?.widthMode;
  if (mode === "hug" || mode === "fill" || mode === "fixed") return mode;
  return fallback;
}

function shouldUseFillForCenteredLeaf(parentWidthMode: "hug" | "fill" | "fixed" | undefined): boolean {
  return parentWidthMode !== "hug";
}

function mergeWrapperAlign(
  wrapper: CompactNode["wrapper"] | undefined,
  horizontalFallback: HorizontalAlign,
  patch: { widthMode?: "hug" | "fill"; overlayImage?: boolean } = {}
): NonNullable<CompactNode["wrapper"]> {
  const next = { ...(wrapper ?? {}) };
  next.contentAlign = mergeContentAlignPreservingExplicit(
    next.contentAlign,
    horizontalFallback,
    { overlayImage: patch.overlayImage }
  );
  if (patch.widthMode && !next.widthMode) {
    next.widthMode = patch.widthMode;
  }
  return next;
}

function resolvedHorizontal(
  wrapper: CompactNode["wrapper"] | undefined,
  horizontalFallback: HorizontalAlign
): HorizontalAlign {
  return normalizeWrapperContentAlign(wrapper?.contentAlign, horizontalFallback).horizontal;
}

/**
 * 将 Stage A 的 layoutHints.align 落到 compact 树（LLM 未写 wrapper.contentAlign 时由程序补全）。
 * - 区段根 / 图标行：仍用 layoutHints.align
 * - 嵌套 layout：缺省继承父级水平对齐
 * - text / button：缺省继承父 layout 水平对齐（勿一律盖区段 center）
 * - LLM 已写合法 horizontal 时保留
 */
export function applySectionContentAlign(root: CompactNode, section: GroundingSection): CompactNode {
  const sectionAlign = horizontalAlignFromSection(section);

  const walk = (
    node: CompactNode,
    isSectionRoot: boolean,
    parentHorizontal: HorizontalAlign | undefined,
    parentWidthMode?: "hug" | "fill" | "fixed"
  ): CompactNode => {
    let next: CompactNode = { ...node };
    const horizontalFallback = parentHorizontal ?? sectionAlign;

    if (isSectionRoot) {
      const widthMode = isIconRowLayout(node) ? "hug" : "fill";
      next.wrapper = mergeWrapperAlign(next.wrapper, sectionAlign, { widthMode });
    } else if (isIconRowLayout(node)) {
      next.wrapper = mergeWrapperAlign(next.wrapper, sectionAlign, { widthMode: "hug" });
    } else if (node.kind === "layout.container") {
      next.wrapper = mergeWrapperAlign(next.wrapper, horizontalFallback);
    }

    const ownWidthMode = resolveWidthMode(
      next.wrapper,
      isSectionRoot ? (isIconRowLayout(node) ? "hug" : "fill") : undefined
    );

    if (node.kind === "content.text") {
      next.wrapper = mergeWrapperAlign(next.wrapper, horizontalFallback);
      const h = resolvedHorizontal(next.wrapper, horizontalFallback);
      if (h === "center") {
        next.wrapper = {
          ...next.wrapper!,
          widthMode: shouldUseFillForCenteredLeaf(parentWidthMode) ? "fill" : "hug",
        };
      }
    }

    if (node.kind === "action.button") {
      next.wrapper = mergeWrapperAlign(next.wrapper, horizontalFallback);
    }

    if (isOverlayImageNode(node)) {
      next.wrapper = {
        ...(next.wrapper ?? {}),
        contentAlign: normalizeOverlayImageContentAlign(next.wrapper?.contentAlign, horizontalFallback),
      };
    }

    const alignForChildren = isLayoutAlignParent(node.kind)
      ? resolvedHorizontal(next.wrapper, isSectionRoot ? sectionAlign : horizontalFallback)
      : parentHorizontal;

    if (Array.isArray(node.children)) {
      next.children = node.children.map((child) =>
        walk(child, false, alignForChildren, ownWidthMode ?? parentWidthMode)
      );
    }

    return next;
  };

  return walk(root, true, undefined, undefined);
}

export const DEFAULT_WRAPPER_CONTENT_ALIGN = {
  horizontal: DEFAULT_SECTION_ALIGN,
  vertical: "top",
} as const;
