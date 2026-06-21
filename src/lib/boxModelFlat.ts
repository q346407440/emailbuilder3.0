import type { BindingSpec } from "../types/email";
import type {
  BorderRadiusValueFlat,
  BorderStyle,
  BorderValueFlat,
  SpacingValueFlat,
} from "../types/email";
import type { ThemeRef } from "../types/themeRef";
import { isThemeRef } from "../types/themeRef";

export const SPACING_SIDES = ["top", "right", "bottom", "left"] as const;
export type SpacingSide = (typeof SPACING_SIDES)[number];

export const BORDER_RADIUS_CORNERS = [
  "topLeft",
  "topRight",
  "bottomRight",
  "bottomLeft",
] as const;
export type BorderRadiusCorner = (typeof BORDER_RADIUS_CORNERS)[number];

export function isFlatSpacingValue(raw: unknown): raw is SpacingValueFlat {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  if ("mode" in o || "unified" in o) return false;
  return SPACING_SIDES.every((side) => side in o);
}

export function isFlatBorderValue(raw: unknown): raw is BorderValueFlat {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  if ("mode" in o || "width" in o) return false;
  return (
    typeof o.style === "string" &&
    o.color !== undefined &&
    SPACING_SIDES.every((side) => typeof o[side] === "string")
  );
}

export function isFlatBorderRadiusValue(raw: unknown): raw is BorderRadiusValueFlat {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  if ("mode" in o || "radius" in o) return false;
  return BORDER_RADIUS_CORNERS.every((corner) => corner in o);
}

/** 四边同值 padding（方案 2 组装器默认形态）。 */
export function spacingUniform(value: string | ThemeRef): SpacingValueFlat {
  return {
    top: value,
    right: value,
    bottom: value,
    left: value,
  };
}

export function spacingZero(): SpacingValueFlat {
  return spacingUniform("0");
}

/** 无描边（四边宽 0）。 */
export function borderNoneFlat(): BorderValueFlat {
  return {
    style: "solid",
    color: "rgba(0,0,0,0)",
    top: "0",
    right: "0",
    bottom: "0",
    left: "0",
  };
}

/** 四角同值圆角。 */
export function borderRadiusUniform(value: string | ThemeRef): BorderRadiusValueFlat {
  return {
    topLeft: value,
    topRight: value,
    bottomRight: value,
    bottomLeft: value,
  };
}

export function borderRadiusZeroFlat(): BorderRadiusValueFlat {
  return borderRadiusUniform("0");
}

function normalizeBorderStyle(raw: unknown): BorderStyle {
  return raw === "dashed" || raw === "dotted" ? raw : "solid";
}

function normalizeBoxSideValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return "0";
}

function normalizeThemeOrString(value: unknown, fallback: string): string | ThemeRef {
  if (isThemeRef(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

/** 读取侧：仅接受四边平铺；否则回落 spacingZero。 */
export function ensureFlatSpacing(padding: unknown): SpacingValueFlat {
  if (!padding) return spacingZero();
  if (isFlatSpacingValue(padding)) return padding;
  return spacingZero();
}

export function getSpacingSide(padding: unknown, side: SpacingSide): string | ThemeRef | undefined {
  if (!isFlatSpacingValue(padding)) return undefined;
  return padding[side];
}

/** 落盘前归一 padding（四边平铺；缺边补 0；拒绝 mode/unified）。 */
export function normalizeSpacingValueForStorage(value: unknown): SpacingValueFlat {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return spacingZero();
  }
  const raw = value as Record<string, unknown>;
  if ("mode" in raw || "unified" in raw) {
    return spacingZero();
  }
  return {
    top: normalizeThemeOrString(raw.top, "0"),
    right: normalizeThemeOrString(raw.right, "0"),
    bottom: normalizeThemeOrString(raw.bottom, "0"),
    left: normalizeThemeOrString(raw.left, "0"),
  };
}

/** 落盘前归一 border（仅四边平铺）。 */
export function normalizeBorderValueForStorage(raw: unknown): BorderValueFlat {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !isFlatBorderValue(raw)) {
    return borderNoneFlat();
  }
  return {
    style: normalizeBorderStyle(raw.style),
    color: normalizeThemeOrString(raw.color, "rgba(0,0,0,0)"),
    top: normalizeBoxSideValue(raw.top),
    right: normalizeBoxSideValue(raw.right),
    bottom: normalizeBoxSideValue(raw.bottom),
    left: normalizeBoxSideValue(raw.left),
  };
}

/** 落盘前归一 borderRadius（仅四角平铺）。 */
export function normalizeBorderRadiusValueForStorage(raw: unknown): BorderRadiusValueFlat {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !isFlatBorderRadiusValue(raw)) {
    return borderRadiusZeroFlat();
  }
  return {
    topLeft: normalizeThemeOrString(raw.topLeft, "0"),
    topRight: normalizeThemeOrString(raw.topRight, "0"),
    bottomRight: normalizeThemeOrString(raw.bottomRight, "0"),
    bottomLeft: normalizeThemeOrString(raw.bottomLeft, "0"),
  };
}

/** 四边同值时，为每条边复制同一条 theme binding。 */
export function uniformSpacingWithBindings(
  fieldPrefix: string,
  value: string | ThemeRef,
  binding?: BindingSpec
): { padding: SpacingValueFlat; bindings?: Record<string, BindingSpec> } {
  const padding = spacingUniform(value);
  if (!binding) return { padding };
  const bindings = Object.fromEntries(
    SPACING_SIDES.map((side) => [`${fieldPrefix}.padding.${side}`, binding] as const)
  ) as Record<string, BindingSpec>;
  return { padding, bindings };
}

/** 四角同值时，为每个角复制同一条 theme binding。 */
export function uniformBorderRadiusWithBindings(
  fieldPrefix: string,
  value: string | ThemeRef,
  binding?: BindingSpec
): { borderRadius: BorderRadiusValueFlat; bindings?: Record<string, BindingSpec> } {
  const borderRadius = borderRadiusUniform(value);
  if (!binding) return { borderRadius };
  const bindings = Object.fromEntries(
    BORDER_RADIUS_CORNERS.map(
      (corner) => [`${fieldPrefix}.borderRadius.${corner}`, binding] as const
    )
  ) as Record<string, BindingSpec>;
  return { borderRadius, bindings };
}

/** buttonStyle / barBorderRadius 等嵌套在 props 下的圆角字段。 */
export function uniformNestedBorderRadiusWithBindings(
  bindPathPrefix: string,
  value: string | ThemeRef,
  binding?: BindingSpec
): { borderRadius: BorderRadiusValueFlat; bindings?: Record<string, BindingSpec> } {
  const borderRadius = borderRadiusUniform(value);
  if (!binding) return { borderRadius };
  const bindings = Object.fromEntries(
    BORDER_RADIUS_CORNERS.map(
      (corner) => [`${bindPathPrefix}.${corner}`, binding] as const
    )
  ) as Record<string, BindingSpec>;
  return { borderRadius, bindings };
}

export type FlatBoxModelValue = SpacingValueFlat | BorderValueFlat | BorderRadiusValueFlat;

/** Inspector / 表单展示：字面量或 $themeRef 路径。 */
export function boxModelSideDisplayValue(value: string | ThemeRef | undefined): string {
  if (value === undefined) return "0";
  if (typeof value === "string") return value;
  return value.$themeRef;
}
