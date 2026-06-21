import type { EmailBlock, EmailTemplate, LayoutGapMode, WrapperStyle } from "../types/email";
import { isThemeRef } from "../types/themeRef";

import { EMAIL_ROOT_FIXED_WIDTH } from "../render-defaults-contract/values";
import { borderNoneFlat, normalizeBorderValueForStorage } from "./boxModelFlat";
import { normalizeSpacingValueForStorage } from "./spacingValue";

const ROOT_FIXED_WIDTH = EMAIL_ROOT_FIXED_WIDTH;
const ROOT_DEFAULT_BG = "#ffffff";

function normalizeRootBorder(value: unknown) {
  return normalizeBorderValueForStorage(value ?? borderNoneFlat());
}

function normalizeRootWrapperStyle(value: unknown): WrapperStyle {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? ({ ...(value as WrapperStyle) } as WrapperStyle)
      : ({} as WrapperStyle);
  const base = raw;

  return {
    ...base,
    widthMode: base.widthMode === "hug" || base.widthMode === "fill" || base.widthMode === "fixed"
      ? base.widthMode
      : "fill",
    heightMode:
      base.heightMode === "hug" || base.heightMode === "fill" || base.heightMode === "fixed"
        ? base.heightMode
        : "hug",
  };
}

/** 规范化根节点：禁止依赖隐式默认，始终输出明确可回写值。 */
export function normalizeEmailRootBlock(template: EmailTemplate): EmailTemplate {
  const root = template.blocks[template.rootBlockId];
  if (!root || root.type !== "emailRoot") {
    return template;
  }

  const rootPropsRaw =
    root.props && typeof root.props === "object" && !Array.isArray(root.props)
      ? (root.props as Record<string, unknown>)
      : {};

  const normalizedRoot: EmailBlock = {
    ...root,
    wrapperStyle: normalizeRootWrapperStyle(root.wrapperStyle),
    props: {
      backgroundColor: (() => {
        const raw = rootPropsRaw.backgroundColor;
        if (isThemeRef(raw)) return raw;
        if (typeof raw === "string" && raw.trim()) return raw.trim();
        return ROOT_DEFAULT_BG;
      })(),
      width: ((): string => {
        const w = rootPropsRaw.width;
        if (typeof w === "string" && w.trim()) return w.trim();
        return ROOT_FIXED_WIDTH;
      })(),
      padding: normalizeSpacingValueForStorage(rootPropsRaw.padding),
      border: normalizeRootBorder(rootPropsRaw.border),
      gapMode: ((): LayoutGapMode => {
        const raw = rootPropsRaw.gapMode;
        return raw === "auto" ? "auto" : "fixed";
      })(),
      gap: (() => {
        const raw = rootPropsRaw.gap;
        if (isThemeRef(raw)) return raw;
        if (typeof raw === "string" && raw.trim()) return raw.trim();
        return "0";
      })(),
    },
  };

  return {
    ...template,
    blocks: {
      ...template.blocks,
      [root.id]: normalizedRoot,
    },
  };
}
