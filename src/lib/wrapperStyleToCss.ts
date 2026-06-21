import type { CSSProperties } from "react";
import type { WrapperHeightMode, WrapperStyle, WrapperWidthMode } from "../types/email";
import {
  ensureFlatSpacing,
  isFlatBorderRadiusValue,
  isFlatBorderValue,
} from "./boxModelFlat";
import {
  normalizeWrapperDimensionMode,
  resolveWrapperHeightCss,
  resolveWrapperWidthCss,
} from "./canvasDimensionResolve";

function normalizeSpaceValue(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return v === "" ? "0" : v;
}

function normalizeWrapperWidthMode(raw: unknown): WrapperWidthMode {
  return normalizeWrapperDimensionMode(raw, "fill");
}

function normalizeWrapperHeightMode(raw: unknown): WrapperHeightMode {
  return normalizeWrapperDimensionMode(raw, "hug");
}

/** 将 SpacingValue 映射为 CSS padding 简写（供 wrapperStyle.padding 等复用） */
export function paddingToCss(p: unknown): string | undefined {
  if (!p || typeof p !== "object") return undefined;
  const flat = ensureFlatSpacing(p);
  const t = normalizeSpaceValue(flat.top) ?? "0";
  const r = normalizeSpaceValue(flat.right) ?? "0";
  const b = normalizeSpaceValue(flat.bottom) ?? "0";
  const l = normalizeSpaceValue(flat.left) ?? "0";
  return `${t} ${r} ${b} ${l}`;
}

function normalizeBorderStyleSafe(raw: unknown): "solid" | "dashed" | "dotted" {
  return raw === "dashed" || raw === "dotted" ? raw : "solid";
}

function sideWidth(raw: unknown): string | undefined {
  return normalizeSpaceValue(raw);
}

/** 把描边对象映射为 CSS（须为四边平铺）。 */
export function borderToCss(raw: unknown): CSSProperties {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !isFlatBorderValue(raw)) return {};
  const flat = raw;
  const style = normalizeBorderStyleSafe(flat.style);
  const color = typeof flat.color === "string" && flat.color.trim() ? flat.color.trim() : undefined;
  if (!color) return {};
  const out: CSSProperties = {};
  const applyFlat = (key: keyof CSSProperties, width: unknown) => {
    const w = normalizeSpaceValue(width);
    if (!w) return;
    (out as Record<string, string>)[key as string] = `${w} ${style} ${color}`;
  };
  applyFlat("borderTop", flat.top);
  applyFlat("borderRight", flat.right);
  applyFlat("borderBottom", flat.bottom);
  applyFlat("borderLeft", flat.left);
  return out;
}

/** 解析 CSS border 简写或 longhand 的首段宽度（px）；无法解析时视为 0。 */
function parseCssBorderWidthPx(value: string): number {
  const first = value.trim().split(/\s+/)[0] ?? "";
  if (!first || first === "0") return 0;
  const m = first.match(/^([\d.]+)px$/);
  return m ? parseFloat(m[1]) : 0;
}

/** borderToCss 产物是否含可见线宽（>0），用于底图 td 描边是否触发表格 separate 等布局派生。 */
export function borderCssHasVisibleWidth(css: CSSProperties): boolean {
  const keys = ["border", "borderTop", "borderRight", "borderBottom", "borderLeft"] as const;
  for (const key of keys) {
    const raw = css[key];
    if (typeof raw === "string" && parseCssBorderWidthPx(raw) > 0) return true;
  }
  return false;
}

/** 把圆角对象映射为 CSS（须为四角平铺）。 */
export function borderRadiusToCss(raw: unknown): CSSProperties {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !isFlatBorderRadiusValue(raw)) {
    return {};
  }
  const flat = raw;
  const tl = normalizeSpaceValue(flat.topLeft);
  const tr = normalizeSpaceValue(flat.topRight);
  const br = normalizeSpaceValue(flat.bottomRight);
  const bl = normalizeSpaceValue(flat.bottomLeft);
  if (!tl || !tr || !br || !bl) return {};
  if (tl === tr && tr === br && br === bl) {
    return { borderRadius: tl };
  }
  return {
    borderTopLeftRadius: tl,
    borderTopRightRadius: tr,
    borderBottomRightRadius: br,
    borderBottomLeftRadius: bl,
  };
}

export type WrapperStyleToCssOptions = {
  /** 底图块外层：padding 由叠放层消费，不写入容器 */
  omitPadding?: boolean;
};

/** 将外层容器样式（wrapperStyle）子集映射为 React 内联样式 */
export function wrapperStyleToCss(ws: WS | undefined, options?: WrapperStyleToCssOptions): CSSProperties {
  if (!ws) return {};
  const s: CSSProperties = {};
  if (typeof ws.backgroundColor === "string") s.backgroundColor = ws.backgroundColor;
  if (!options?.omitPadding) {
    const pad = paddingToCss(ws.padding);
    if (pad) s.padding = pad;
  }

  const widthMode = normalizeWrapperWidthMode(ws.widthMode);
  Object.assign(
    s,
    resolveWrapperWidthCss({
      mode: widthMode,
      fixedWidth: ws.width,
      fallbackMode: "fill",
    })
  );

  const heightMode = normalizeWrapperHeightMode(ws.heightMode);
  Object.assign(
    s,
    resolveWrapperHeightCss({
      mode: heightMode,
      fixedHeight: ws.height,
      fallbackMode: "hug",
    })
  );
  /** contentAlign.horizontal → text-align（文本排版对齐） */
  const ca = ws.contentAlign as { horizontal?: string } | undefined;
  if (ca?.horizontal === "center") s.textAlign = "center";
  else if (ca?.horizontal === "left") s.textAlign = "left";
  else if (ca?.horizontal === "right") s.textAlign = "right";
  Object.assign(s, borderRadiusToCss(ws.borderRadius));
  Object.assign(s, borderToCss(ws.border));
  return s;
}
