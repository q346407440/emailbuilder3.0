import type { CSSProperties } from "react";
import type { WrapperHeightMode, WrapperStyle, WrapperWidthMode } from "../types/email";

type WS = WrapperStyle;

function normalizeSpaceValue(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return v === "" ? "0" : v;
}

function normalizeWrapperWidthMode(raw: unknown): WrapperWidthMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "fill";
}

function normalizeWrapperHeightMode(raw: unknown): WrapperHeightMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return "hug";
}

/** 将 SpacingValue 映射为 CSS padding 简写（供 wrapperStyle.padding 等复用） */
export function paddingToCss(p: unknown): string | undefined {
  if (!p || typeof p !== "object") return undefined;
  const o = p as Record<string, unknown>;
  if (o.mode === "unified" || (o.mode === undefined && o.unified !== undefined)) {
    return normalizeSpaceValue(o.unified);
  }
  if (o.mode === "separate") {
    const t = normalizeSpaceValue(o.top) ?? "0";
    const r = normalizeSpaceValue(o.right) ?? "0";
    const b = normalizeSpaceValue(o.bottom) ?? "0";
    const l = normalizeSpaceValue(o.left) ?? "0";
    return `${t} ${r} ${b} ${l}`;
  }
  return undefined;
}

function normalizeBorderStyleSafe(raw: unknown): "solid" | "dashed" | "dotted" {
  return raw === "dashed" || raw === "dotted" ? raw : "solid";
}

function sideWidth(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return normalizeSpaceValue((raw as Record<string, unknown>).width);
}

/** 把描边对象映射为 CSS。`unified` → `border`；`custom` → 4 个 longhand（width=0 的边跳过）。 */
export function borderToCss(raw: unknown): CSSProperties {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const style = normalizeBorderStyleSafe(o.style);
  const color = typeof o.color === "string" && o.color.trim() ? o.color.trim() : undefined;
  if (!color) return {};
  if (o.mode === "unified") {
    const width = normalizeSpaceValue(o.width);
    if (!width) return {};
    return { border: `${width} ${style} ${color}` };
  }
  if (o.mode === "custom") {
    const out: CSSProperties = {};
    const apply = (key: keyof CSSProperties, raw: unknown) => {
      const w = sideWidth(raw);
      if (!w) return;
      (out as Record<string, string>)[key as string] = `${w} ${style} ${color}`;
    };
    apply("borderTop", o.top);
    apply("borderRight", o.right);
    apply("borderBottom", o.bottom);
    apply("borderLeft", o.left);
    return out;
  }
  return {};
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

/** 把圆角对象映射为 CSS。`unified` → `borderRadius`；`corners` → 4 个 longhand。 */
export function borderRadiusToCss(raw: unknown): CSSProperties {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  if (o.mode === "unified") {
    const r = normalizeSpaceValue(o.radius);
    return r ? { borderRadius: r } : {};
  }
  if (o.mode === "corners") {
    const tl = normalizeSpaceValue(o.topLeft);
    const tr = normalizeSpaceValue(o.topRight);
    const br = normalizeSpaceValue(o.bottomRight);
    const bl = normalizeSpaceValue(o.bottomLeft);
    if (!tl || !tr || !br || !bl) return {};
    return {
      borderTopLeftRadius: tl,
      borderTopRightRadius: tr,
      borderBottomRightRadius: br,
      borderBottomLeftRadius: bl,
    };
  }
  return {};
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
  if (widthMode === "fill") {
    s.width = "100%";
  } else if (widthMode === "fixed") {
    const w = typeof ws.width === "string" ? ws.width.trim() : "";
    if (w) s.width = w;
  } else {
    s.width = "auto";
    s.maxWidth = "100%";
  }

  const heightMode = normalizeWrapperHeightMode(ws.heightMode);
  if (heightMode === "fill") {
    s.height = "100%";
  } else if (heightMode === "fixed") {
    const h = typeof ws.height === "string" ? ws.height.trim() : "";
    if (h) s.height = h;
  }
  /** contentAlign.horizontal → text-align（文本排版对齐） */
  const ca = ws.contentAlign as { horizontal?: string } | undefined;
  if (ca?.horizontal === "center") s.textAlign = "center";
  else if (ca?.horizontal === "left") s.textAlign = "left";
  else if (ca?.horizontal === "right") s.textAlign = "right";
  Object.assign(s, borderRadiusToCss(ws.borderRadius));
  Object.assign(s, borderToCss(ws.border));
  return s;
}
