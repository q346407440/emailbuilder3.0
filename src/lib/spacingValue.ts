import type { SpacingValue } from "../types/email";
import type { ThemeRef } from "../types/themeRef";
import { isThemeRef } from "../types/themeRef";

const SPACING_SIDES = ["top", "right", "bottom", "left"] as const;

function normalizeSpacingSide(value: unknown): string | ThemeRef {
  if (isThemeRef(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return "0";
}

function hasSeparateSideValues(raw: Record<string, unknown>): boolean {
  return SPACING_SIDES.some((side) => raw[side] !== undefined);
}

/**
 * 将 spacing 归一为契约要求的 SpacingValue（须显式含 mode）。
 * 校验真源见 validateSpacingObject；读写层统一经此函数落盘。
 */
export function normalizeSpacingValueForStorage(value: unknown): SpacingValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { mode: "unified", unified: "0" };
  }
  const raw = value as Record<string, unknown>;
  if (raw.mode === "separate" || (raw.mode !== "unified" && hasSeparateSideValues(raw))) {
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

/** bindPath 子路径是否落在 padding 字段上（props.padding / wrapperStyle.padding）。 */
export function isPaddingFieldSubPath(sub: string): boolean {
  return sub === "padding" || sub.startsWith("padding.");
}

export function coercePaddingOnContainer(container: Record<string, unknown> | undefined): void {
  if (!container) return;
  const pad = container.padding;
  if (pad === undefined || pad === null) return;
  container.padding = normalizeSpacingValueForStorage(pad);
}

/** 若 padding 缺 mode 等则归一；返回是否发生变更。 */
export function coercePaddingOnContainerIfChanged(
  container: Record<string, unknown> | undefined
): boolean {
  if (!container?.padding) return false;
  const before = JSON.stringify(container.padding);
  coercePaddingOnContainer(container);
  return JSON.stringify(container.padding) !== before;
}
