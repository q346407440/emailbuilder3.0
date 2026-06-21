import {
  ensureFlatSpacing,
  getSpacingSide,
  isFlatSpacingValue,
  SPACING_SIDES,
  type SpacingSide,
} from "../lib/boxModelFlat";
import { isThemeRef, parseThemeRefPath, type ThemeRef } from "../types/themeRef";
import type { EmailBlock, EmailTemplate } from "../types/email";
import type { RestoreTheme } from "./types";

const ROOT_SHELL_BLOCK_TYPES = new Set(["layout.container", "layout.grid"]);

/** email 根下首层 layout.container / layout.grid 是否参与 seam 折叠。 */
export function isEmailRootLayoutShell(
  block: EmailBlock | undefined,
  blockType: string | undefined
): boolean {
  if (!block || !blockType || !ROOT_SHELL_BLOCK_TYPES.has(blockType)) return false;
  if (blockType === "layout.container") return block.type === "layout";
  return block.type === "grid";
}

function resolveThemeRefToLiteral(path: string, theme: RestoreTheme): string | null {
  const p = path.trim();
  if (p.startsWith("colors.")) {
    const key = p.slice("colors.".length) as keyof RestoreTheme["colors"];
    return theme.colors[key] ?? null;
  }
  if (p.startsWith("tokens.spacing.")) {
    const key = p.slice("tokens.spacing.".length) as keyof RestoreTheme["spacing"];
    return theme.spacing[key] ?? null;
  }
  return null;
}

function resolveSpacingLiteral(value: string | ThemeRef | undefined, theme: RestoreTheme): string | null {
  if (value === undefined) return null;
  if (typeof value === "string") return value;
  if (isThemeRef(value)) return resolveThemeRefToLiteral(parseThemeRefPath(value), theme);
  return null;
}

/** 未写 backgroundColor 时视为 theme.colors.surface（与显式 surface 同色）。 */
function resolveBackgroundLiteral(
  value: string | ThemeRef | undefined,
  theme: RestoreTheme
): string {
  if (value === undefined) return theme.colors.surface;
  if (typeof value === "string") return value;
  if (isThemeRef(value)) {
    return resolveThemeRefToLiteral(parseThemeRefPath(value), theme) ?? theme.colors.surface;
  }
  return theme.colors.surface;
}

function parsePx(literal: string): number | null {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(literal.trim());
  return m ? Number(m[1]) : null;
}

function spacingValuesEqual(
  a: string | ThemeRef | undefined,
  b: string | ThemeRef | undefined,
  theme: RestoreTheme
): boolean {
  if (a === undefined || b === undefined) return false;
  if (isThemeRef(a) && isThemeRef(b)) {
    return parseThemeRefPath(a) === parseThemeRefPath(b);
  }
  const la = resolveSpacingLiteral(a, theme);
  const lb = resolveSpacingLiteral(b, theme);
  if (la === null || lb === null) return false;
  return la === lb;
}

function halvePxLiteral(literal: string): string {
  const px = parsePx(literal);
  if (px === null) return literal;
  const half = px / 2;
  return Number.isInteger(half) ? `${half}px` : `${half}px`;
}

function halveSpacingValue(
  value: string | ThemeRef | undefined,
  theme: RestoreTheme
): string {
  const literal = resolveSpacingLiteral(value, theme);
  if (literal === null) return "0px";
  return halvePxLiteral(literal);
}

function clearPaddingBindings(bindings: EmailBlock["bindings"]): EmailBlock["bindings"] {
  if (!bindings) return bindings;
  const next = { ...bindings };
  for (const key of Object.keys(next)) {
    if (key.startsWith("wrapperStyle.padding.")) {
      delete next[key];
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function bindingForPaddingSide(side: SpacingSide, value: string | ThemeRef): Record<string, unknown> | undefined {
  if (!isThemeRef(value)) return undefined;
  const path = parseThemeRefPath(value);
  const slotId = path.startsWith("tokens.") ? path.slice("tokens.".length) : path;
  return {
    [`wrapperStyle.padding.${side}`]: {
      slotId,
      mode: "theme",
      tokenPath: path,
      fieldKind: "style",
    },
  };
}

function rebuildPaddingBindings(
  padding: ReturnType<typeof ensureFlatSpacing>
): EmailBlock["bindings"] | undefined {
  const parts: Record<string, unknown>[] = [];
  for (const side of SPACING_SIDES) {
    const v = padding[side];
    const b = bindingForPaddingSide(side, v);
    if (b) parts.push(b);
  }
  if (parts.length === 0) return undefined;
  return Object.assign({}, ...parts) as EmailBlock["bindings"];
}

function setPaddingSide(
  block: EmailBlock,
  side: SpacingSide,
  nextValue: string | ThemeRef
): void {
  const wrapperStyle = { ...(block.wrapperStyle ?? {}) };
  const padding = { ...ensureFlatSpacing(wrapperStyle.padding), [side]: nextValue };
  wrapperStyle.padding = padding;
  block.wrapperStyle = wrapperStyle;

  const kept = clearPaddingBindings(block.bindings);
  const paddingBindings = rebuildPaddingBindings(padding);
  block.bindings =
    kept || paddingBindings ? { ...(kept ?? {}), ...(paddingBindings ?? {}) } : undefined;
}

function shouldCollapseSeam(
  prev: EmailBlock,
  next: EmailBlock,
  theme: RestoreTheme
): boolean {
  const prevBg = resolveBackgroundLiteral(prev.wrapperStyle?.backgroundColor, theme);
  const nextBg = resolveBackgroundLiteral(next.wrapperStyle?.backgroundColor, theme);
  if (prevBg !== nextBg) return false;

  const prevBottom = getSpacingSide(prev.wrapperStyle?.padding, "bottom");
  const nextTop = getSpacingSide(next.wrapperStyle?.padding, "top");
  return spacingValuesEqual(prevBottom, nextTop, theme);
}

function halveSeamBetween(prev: EmailBlock, next: EmailBlock, theme: RestoreTheme): void {
  const prevBottom = getSpacingSide(prev.wrapperStyle?.padding, "bottom");
  const nextTop = getSpacingSide(next.wrapperStyle?.padding, "top");
  if (prevBottom === undefined || nextTop === undefined) return;

  setPaddingSide(prev, "bottom", halveSpacingValue(prevBottom, theme));
  setPaddingSide(next, "top", halveSpacingValue(nextTop, theme));
}

/**
 * email 根下首层 layout/grid 壳：相邻且同色、接缝 padding 一致时，上块 bottom / 下块 top 各折半。
 * 未写 backgroundColor 的壳与 theme.colors.surface 视为同色。
 */
export function collapseRootSiblingPaddingSeams(
  template: EmailTemplate,
  theme: RestoreTheme
): EmailTemplate {
  const root = template.blocks[template.rootBlockId];
  if (!root?.children?.length) return template;

  const shellIds = root.children.filter((id) => {
    const block = template.blocks[id];
    const blockType = template.blockMeta?.[id]?.blockType;
    return isEmailRootLayoutShell(block, blockType);
  });

  if (shellIds.length < 2) return template;

  const blocks = { ...template.blocks };
  for (let i = 0; i < shellIds.length - 1; i += 1) {
    const prevId = shellIds[i]!;
    const nextId = shellIds[i + 1]!;
    const prev = { ...blocks[prevId]! };
    const next = { ...blocks[nextId]! };

    if (!shouldCollapseSeam(prev, next, theme)) continue;

    halveSeamBetween(prev, next, theme);
    blocks[prevId] = prev;
    blocks[nextId] = next;
  }

  return { ...template, blocks };
}

/** @internal 供单测断言平铺 padding 形态。 */
export function isFlatPaddingBlock(block: EmailBlock | undefined): boolean {
  return isFlatSpacingValue(block?.wrapperStyle?.padding);
}
