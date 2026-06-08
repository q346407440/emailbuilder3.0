import { parsePxValue } from "../b1StyleTierPresets";
import type { CompactNode, GroundingSection } from "../types";

/** 区段壳 padding 单边上限（与 email-template-restore-check §19 一致）。 */
export const SECTION_ROOT_PADDING_MAX_PX = 24;

export type SectionRootSeparatePadding = {
  mode: "separate";
  top: string;
  right: string;
  bottom: string;
  left: string;
};

function clampSectionPaddingPx(px: number): number {
  return Math.min(SECTION_ROOT_PADDING_MAX_PX, Math.max(0, Math.round(px)));
}

function toPaddingPx(px: number): string {
  if (px <= 0) return "0";
  return `${clampSectionPaddingPx(px)}px`;
}

/** B1 spacing 档位 → 全区统一的竖直/水平节奏（字面量 px）。 */
export function resolveUniformSectionSpacing(spacing: {
  section: string;
  pageInline: string;
}): { vertical: string; horizontal: string } {
  return {
    vertical: toPaddingPx(parsePxValue(spacing.section)),
    horizontal: toPaddingPx(parsePxValue(spacing.pageInline)),
  };
}

/**
 * 区段壳四边 padding：全区统一节奏（整齐度约束），不由 Stage C / 逐区 gap 写入。
 *
 * - **竖直**：除首区 top=0 外，所有区 top/bottom 均为 B1 `section`（与 coupon-available 模块壳一致）
 * - **水平**：所有非 fullWidth 区 left/right 均为 B1 `pageInline`；fullWidth 贴边区左右为 0
 * - **Stage A gapAbove/gapBelow**：不再写入区段壳（避免相邻区 padding 相加导致间距参差不齐）；后续可用于 B1 section 档位提示
 */
export function resolveSectionRootPadding(input: {
  section: GroundingSection;
  orderIndex: number;
  spacing: { section: string; pageInline: string };
}): SectionRootSeparatePadding {
  const { section, orderIndex, spacing } = input;
  const fullWidth = section.layoutHints?.fullWidth === true;
  const uniform = resolveUniformSectionSpacing(spacing);

  const top = orderIndex <= 0 ? "0" : uniform.vertical;
  const inline = fullWidth ? "0" : uniform.horizontal;

  return {
    mode: "separate",
    top,
    right: inline,
    bottom: uniform.vertical,
    left: inline,
  };
}

/**
 * D：剥离 Stage C 误写的区段级 padding（叠加层 content.image 的内边距除外）。
 */
export function stripSectionRootSpacingPadding(
  root: CompactNode,
  section: GroundingSection
): CompactNode {
  if (root.kind === "content.image" && section.hasOverlay) return root;
  if (!root.wrapper?.padding) return root;
  const { padding: _padding, ...rest } = root.wrapper;
  return {
    ...root,
    ...(Object.keys(rest).length > 0 ? { wrapper: rest } : {}),
  };
}
