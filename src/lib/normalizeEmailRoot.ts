import type {
  BorderStyle,
  BorderValue,
  EmailBlock,
  EmailTemplate,
  LayoutGapMode,
  SpacingValue,
  WrapperStyle,
} from "../types/email";
import type { ThemeRef } from "../types/themeRef";
import { isThemeRef } from "../types/themeRef";

import { EMAIL_ROOT_FIXED_WIDTH } from "../render-defaults-contract/values";

const ROOT_FIXED_WIDTH = EMAIL_ROOT_FIXED_WIDTH;
const ROOT_DEFAULT_BG = "#ffffff";
const ROOT_DEFAULT_BORDER: BorderValue = {
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
};

function pickBorderStyle(raw: unknown): BorderStyle {
  return raw === "dashed" || raw === "dotted" ? raw : "solid";
}

function normalizeRootBorder(value: unknown): BorderValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...ROOT_DEFAULT_BORDER };
  }
  const raw = value as Record<string, unknown>;
  const style = pickBorderStyle(raw.style);
  const color =
    typeof raw.color === "string" && raw.color.trim() ? raw.color.trim() : "rgba(0,0,0,0)";
  if (raw.mode === "custom") {
    const sideWidth = (s: unknown): string => {
      if (!s || typeof s !== "object") return "0";
      const w = (s as Record<string, unknown>).width;
      return typeof w === "string" && w.trim() ? w.trim() : "0";
    };
    return {
      mode: "custom",
      style,
      color,
      top: { width: sideWidth(raw.top) },
      right: { width: sideWidth(raw.right) },
      bottom: { width: sideWidth(raw.bottom) },
      left: { width: sideWidth(raw.left) },
    };
  }
  const width = typeof raw.width === "string" && raw.width.trim() ? raw.width.trim() : "0";
  return { mode: "unified", width, style, color };
}

function normalizeSpacingSide(value: unknown): string | ThemeRef {
  if (isThemeRef(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "0";
}

function normalizeRootPadding(value: unknown): SpacingValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { mode: "unified", unified: "0" };
  }
  const raw = value as Record<string, unknown>;
  if (raw.mode === "separate") {
    return {
      mode: "separate",
      top: normalizeSpacingSide(raw.top),
      right: normalizeSpacingSide(raw.right),
      bottom: normalizeSpacingSide(raw.bottom),
      left: normalizeSpacingSide(raw.left),
    };
  }
  return {
    mode: "unified",
    unified: normalizeSpacingSide(raw.unified),
  };
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
      padding: normalizeRootPadding(rootPropsRaw.padding),
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
