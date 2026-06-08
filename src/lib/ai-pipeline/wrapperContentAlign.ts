import type { CompactNode } from "./types";

export type HorizontalAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "center" | "bottom";

export type ContentAlignPartial = {
  horizontal?: string;
  vertical?: string;
};

export function isValidHorizontalAlign(value: unknown): value is HorizontalAlign {
  return value === "left" || value === "center" || value === "right";
}

export function isValidVerticalAlign(value: unknown): value is VerticalAlign {
  return value === "top" || value === "center" || value === "bottom";
}

/** LLM 是否已给出可用的水平对齐（D 层不得覆盖）。 */
export function hasExplicitHorizontalAlign(
  wrapper: CompactNode["wrapper"] | undefined
): boolean {
  return isValidHorizontalAlign(wrapper?.contentAlign?.horizontal);
}

/** LLM 是否已给出可用的垂直对齐。 */
export function hasExplicitVerticalAlign(
  wrapper: CompactNode["wrapper"] | undefined
): boolean {
  return isValidVerticalAlign(wrapper?.contentAlign?.vertical);
}

/**
 * 是否仍需程序补全 contentAlign（缺对象或缺轴）。
 * 两轴均已合法时返回 false，compactLayoutConstraints 不得再 patch。
 */
export function needsContentAlignPatch(
  wrapper: CompactNode["wrapper"] | undefined
): boolean {
  if (!wrapper?.contentAlign) return true;
  return !hasExplicitHorizontalAlign(wrapper) || !hasExplicitVerticalAlign(wrapper);
}

export type MergeContentAlignOptions = {
  /** 叠放底图缺省 vertical=center，普通块缺省 vertical=top */
  overlayImage?: boolean;
};

/**
 * 合并 contentAlign：保留 LLM 已写合法轴，仅补缺失轴。
 */
export function mergeContentAlignPreservingExplicit(
  partial: ContentAlignPartial | null | undefined,
  horizontalFallback: HorizontalAlign,
  options: MergeContentAlignOptions = {}
): { horizontal: HorizontalAlign; vertical: VerticalAlign } {
  const defaultVertical: VerticalAlign = options.overlayImage ? "center" : "top";
  const horizontal: HorizontalAlign = isValidHorizontalAlign(partial?.horizontal)
    ? partial.horizontal
    : horizontalFallback;
  const vertical: VerticalAlign = isValidVerticalAlign(partial?.vertical)
    ? partial.vertical
    : defaultVertical;
  return { horizontal, vertical };
}
