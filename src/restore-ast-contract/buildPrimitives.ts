import type { BindingSpec } from "../types/email";
import {
  borderNoneFlat,
  borderRadiusZeroFlat,
  spacingZero,
} from "../lib/boxModelFlat";

/** 正文默认墨色（第 1 步设计 §8）。 */
export const DEFAULT_TEXT_COLOR = "#1A1A1A";

export const DEFAULT_CONTENT_ALIGN = {
  horizontal: "center" as const,
  vertical: "top" as const,
};

export function mergeBindings(
  ...parts: Array<Record<string, BindingSpec> | undefined>
): Record<string, BindingSpec> | undefined {
  const merged = Object.assign({}, ...parts.filter(Boolean));
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export type ThemeBoundScalar = {
  value: string | import("../types/themeRef").ThemeRef;
  bindings?: Record<string, BindingSpec>;
};

/** 无描边（四边平铺 0）。 */
export function borderNone() {
  return borderNoneFlat();
}

/** 零圆角（四角平铺 0）。 */
export function borderRadiusZero() {
  return borderRadiusZeroFlat();
}

/** emailRoot / grid 默认 padding（四边 0）。 */
export function paddingZero() {
  return spacingZero();
}
