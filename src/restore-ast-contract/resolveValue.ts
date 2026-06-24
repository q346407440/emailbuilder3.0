import { themeRefPathForStorage } from "../token-preset-contract/theme-ref-paths";
import type { TokenPresetFamily } from "../token-preset-contract/types";
import {
  uniformBorderRadiusWithBindings,
  uniformNestedBorderRadiusWithBindings,
  uniformSpacingWithBindings,
} from "../lib/boxModelFlat";
import type { BindingSpec, BorderStyle, BorderValueFlat } from "../types/email";
import type { ThemeRef } from "../types/themeRef";
import {
  DEFAULT_TEXT_COLOR,
  type ThemeBoundScalar,
  mergeBindings,
} from "./buildPrimitives";
import {
  isHexValue,
  isPxValue,
  isRadiusToken,
  isRoleToken,
  isSpaceToken,
  isToneToken,
} from "./tokens";
import { RESTORE_AST_BUTTON_RELAXED_HEIGHT_PX } from "./buttonHeight";
import type { BorderStyleToken, Radius, Role, Space, Tone, ToneToken } from "./types";

const DEFAULT_BOX_BORDER_TONE: ToneToken = "secondary";

function themeBinding(fieldPath: string, family: TokenPresetFamily, scale: string): BindingSpec {
  const tokenPath = themeRefPathForStorage(family, scale);
  return {
    slotId: tokenPath,
    mode: "theme",
    tokenPath,
    fieldKind: "style",
  };
}

function bindThemeScalar(
  fieldPath: string,
  family: TokenPresetFamily,
  scale: string
): ThemeBoundScalar {
  const tokenPath = themeRefPathForStorage(family, scale);
  return {
    value: { $themeRef: tokenPath } satisfies ThemeRef,
    bindings: { [fieldPath]: themeBinding(fieldPath, family, scale) },
  };
}

export function resolveTone(
  fieldPath: string,
  tone: Tone | undefined,
  fallbackLiteral: string = DEFAULT_TEXT_COLOR
): ThemeBoundScalar {
  if (tone === undefined) {
    return { value: fallbackLiteral };
  }
  if (isHexValue(tone)) {
    return { value: tone.hex };
  }
  if (isToneToken(tone)) {
    return bindThemeScalar(fieldPath, "colors", tone);
  }
  return { value: fallbackLiteral };
}

export function resolveRole(fieldPath: string, role: Role): ThemeBoundScalar {
  if (isPxValue(role)) {
    return { value: `${role.px}px` };
  }
  if (isRoleToken(role)) {
    return bindThemeScalar(fieldPath, "typography", role);
  }
  return bindThemeScalar(fieldPath, "typography", "body");
}

export function resolveSpace(
  fieldPath: string,
  space: Space | undefined,
  defaultToken: "section" | "gap" | "pageInline" = "gap"
): ThemeBoundScalar {
  if (space === undefined) {
    return bindThemeScalar(fieldPath, "spacing", defaultToken);
  }
  if (isPxValue(space)) {
    return { value: `${space.px}px` };
  }
  if (isSpaceToken(space)) {
    return bindThemeScalar(fieldPath, "spacing", space);
  }
  return bindThemeScalar(fieldPath, "spacing", defaultToken);
}

export function resolveRadius(fieldPath: string, radius: Radius | undefined): ThemeBoundScalar {
  if (radius === undefined) {
    return { value: "0" };
  }
  if (isPxValue(radius)) {
    return { value: `${radius.px}px` };
  }
  if (isRadiusToken(radius)) {
    return bindThemeScalar(fieldPath, "radius", radius);
  }
  return { value: "0" };
}

/** box.border 语义档 → wrapperStyle.border 四边平铺对象。 */
export function resolveBoxBorder(
  fieldPrefix: string,
  border: BorderStyleToken,
  borderTone?: Tone
): {
  border: BorderValueFlat;
  bindings?: Record<string, BindingSpec>;
} {
  const widthPx = border === "thin" ? "2px" : "1px";
  const style: BorderStyle = border === "dashed-hairline" ? "dashed" : "solid";
  const color = resolveTone(`${fieldPrefix}.color`, borderTone ?? DEFAULT_BOX_BORDER_TONE);

  return {
    border: {
      style,
      color: color.value,
      top: widthPx,
      right: widthPx,
      bottom: widthPx,
      left: widthPx,
    },
    bindings: color.bindings,
  };
}

export function resolveIconSizePx(size: import("./types").IconSize | undefined): string {
  if (size === undefined) return "24px";
  if (isPxValue(size)) return `${size.px}px`;
  if (size === "sm") return "16px";
  if (size === "lg") return "32px";
  return "24px";
}

/** image 外层壳背景：底图由 backgroundImage 承载，容器背景固定透明（不继承 box.tone）。 */
export const IMAGE_WRAPPER_BACKGROUND_COLOR = "transparent";

function stripWrapperBackgroundColorBindings(
  bindings: Record<string, BindingSpec> | undefined
): Record<string, BindingSpec> | undefined {
  if (!bindings) return undefined;
  const next: Record<string, BindingSpec> = {};
  for (const [key, spec] of Object.entries(bindings)) {
    if (key === "wrapperStyle.backgroundColor" || key.startsWith("wrapperStyle.backgroundColor.")) {
      continue;
    }
    next[key] = spec;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

/** image 专用 box：保留 pad/radius/border，忽略 tone（背景色由 {@link IMAGE_WRAPPER_BACKGROUND_COLOR} 固定）。 */
export function applyImageBoxWrapper(
  fieldPrefix: string,
  box: import("./types").Box | undefined
): {
  wrapperExtras: Record<string, unknown>;
  bindings?: Record<string, BindingSpec>;
} {
  const boxApplied = applyBoxWrapper(fieldPrefix, box);
  const { backgroundColor: _ignored, ...wrapperExtras } = boxApplied.wrapperExtras;
  return {
    wrapperExtras,
    bindings: stripWrapperBackgroundColorBindings(boxApplied.bindings),
  };
}

export function applyBoxWrapper(
  fieldPrefix: string,
  box: import("./types").Box | undefined
): {
  wrapperExtras: Record<string, unknown>;
  bindings?: Record<string, BindingSpec>;
} {
  if (!box) {
    return { wrapperExtras: {} };
  }

  const wrapperExtras: Record<string, unknown> = {};
  const bindingParts: Array<Record<string, BindingSpec> | undefined> = [];

  if (box.tone !== undefined) {
    const bg = resolveTone(`${fieldPrefix}.backgroundColor`, box.tone);
    wrapperExtras.backgroundColor = bg.value;
    bindingParts.push(bg.bindings);
  }

  if (box.pad !== undefined) {
    const pad = resolveSpace(`${fieldPrefix}.padding.top`, box.pad);
    const applied = uniformSpacingWithBindings(
      fieldPrefix,
      pad.value,
      pad.bindings ? Object.values(pad.bindings)[0] : undefined
    );
    wrapperExtras.padding = applied.padding;
    bindingParts.push(applied.bindings);
  }

  if (box.radius !== undefined) {
    const radius = resolveRadius(`${fieldPrefix}.borderRadius.topLeft`, box.radius);
    const applied = uniformBorderRadiusWithBindings(
      fieldPrefix,
      radius.value,
      radius.bindings ? Object.values(radius.bindings)[0] : undefined
    );
    wrapperExtras.borderRadius = applied.borderRadius;
    bindingParts.push(applied.bindings);
  }

  if (box.border !== undefined) {
    const borderApplied = resolveBoxBorder(`${fieldPrefix}.border`, box.border, box.borderTone);
    wrapperExtras.border = borderApplied.border;
    bindingParts.push(borderApplied.bindings);
  }

  return { wrapperExtras, bindings: mergeBindings(...bindingParts) };
}

/** 按钮 / 进度条等 props 内嵌圆角：四角平铺 + 四路 binding。 */
export function applyUniformNestedBorderRadius(
  bindPathPrefix: string,
  radius: Radius | undefined,
  defaultToken: "panel" | "cta" = "panel"
): {
  borderRadius: import("../types/email").BorderRadiusValueFlat;
  bindings?: Record<string, BindingSpec>;
} {
  const resolved = resolveRadius(`${bindPathPrefix}.topLeft`, radius ?? defaultToken);
  return uniformNestedBorderRadiusWithBindings(
    bindPathPrefix,
    resolved.value,
    resolved.bindings ? Object.values(resolved.bindings)[0] : undefined
  );
}

/** row 主轴 align → stack/text 可用的 cross align（between 视为 start）。 */
export function rowMainAlignToCross(
  align: import("./types").AlignMain | undefined
): import("./types").AlignCross | undefined {
  if (align === undefined) return undefined;
  if (align === "end") return "end";
  if (align === "center") return "center";
  return "start";
}

export function mapStackAlign(align: import("./types").AlignCross | undefined): {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
} {
  const base = { horizontal: "center" as const, vertical: "top" as const };
  if (align === "start") return { ...base, horizontal: "left" };
  if (align === "end") return { ...base, horizontal: "right" };
  if (align === "center") return { ...base, horizontal: "center" };
  return base;
}

/**
 * image 叠放 children 时 contentAlign：`align` → horizontal，`crossAlign` → vertical。
 * 双轴缺省均为 center（hero / 宫格叠字）；角标等需显式写两轴（如 start+start → 左上）。
 */
export function mapImageOverlayAlign(
  align?: import("./types").AlignCross,
  crossAlign?: import("./types").AlignCross
): {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
} {
  return {
    horizontal: mapStackAlign(align ?? "center").horizontal,
    vertical: mapCrossAlignToVertical(crossAlign ?? "center"),
  };
}

/** 按钮胶囊宽度：AST `width` → `buttonStyle.widthMode`（外层 wrapper 恒 fill）。 */
export function resolveButtonStyleWidthMode(
  width: import("./types").ButtonWidth | undefined
): "fill" | "hug" {
  return width === "fill" ? "fill" : "hug";
}

export type ResolvedButtonStyleHeight = {
  heightMode: "hug" | "fixed";
  heightPx?: string;
};

/** 按钮胶囊高度：AST `height` → `buttonStyle.heightMode`（relaxed 时 + 固定 px）。非法值兜底 hug。 */
export function resolveButtonStyleHeight(height: unknown): ResolvedButtonStyleHeight {
  if (height === "relaxed") {
    return {
      heightMode: "fixed",
      heightPx: `${RESTORE_AST_BUTTON_RELAXED_HEIGHT_PX}px`,
    };
  }
  return { heightMode: "hug" };
}

/** row 主轴间距：`between` → gapMode auto（space-between）；其余 fixed。 */
export function resolveRowGapMode(
  align: import("./types").AlignMain | undefined
): "fixed" | "auto" {
  return align === "between" ? "auto" : "fixed";
}

export function mapRowAlign(
  align: import("./types").AlignMain | undefined,
  crossAlign?: import("./types").AlignCross
): {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "center" | "bottom";
} {
  let horizontal: "left" | "center" | "right" = "center";
  if (align === "start") horizontal = "left";
  else if (align === "between") horizontal = "center";
  else if (align === "end") horizontal = "right";
  else if (align === "center") horizontal = "center";

  const vertical =
    crossAlign !== undefined
      ? mapCrossAlignToVertical(crossAlign)
      : align === "center"
        ? "center"
        : "top";

  return { horizontal, vertical };
}

/** row 交叉轴（竖直）→ contentAlign.vertical */
export function mapCrossAlignToVertical(
  crossAlign: import("./types").AlignCross | undefined
): "top" | "center" | "bottom" {
  if (crossAlign === "center") return "center";
  if (crossAlign === "end") return "bottom";
  return "top";
}
