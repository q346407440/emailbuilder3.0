/**
 * 画布 block 尺寸解析 — **产品规则唯一真源**（与 `canvas-dimension-contract` 规则目录一致）。
 *
 * 消费方（须引用本模块，禁止在 EmailPreview / wrapperStyleToCss 等处重复分支）：
 * - `src/components/EmailPreview.tsx`
 * - `src/lib/wrapperStyleToCss.ts`
 * - `src/lib/emailTableLayout.ts`（hug maxWidth 上限）
 * - `src/lib/emailPresentationLayout.ts`（hug 叶壳/布局壳）
 */
import type { CSSProperties } from "react";
import type { WrapperDimensionMode } from "../canvas-dimension-contract";
import { PREVIEW_BLOCK_OVERFLOW } from "../render-defaults-contract/values";

export type { WrapperDimensionMode };

export function normalizeWrapperDimensionMode(
  raw: unknown,
  fallback: WrapperDimensionMode = "fill"
): WrapperDimensionMode {
  if (raw === "hug" || raw === "fill" || raw === "fixed") return raw;
  return fallback;
}

/** fixed 轴不参与自适应压缩 */
export function isStrictFixedAxis(mode: unknown): boolean {
  return normalizeWrapperDimensionMode(mode) === "fixed";
}

/** 解析 CSS 像素字符串（如 `600px`）为整数像素；无法解析时返回 undefined。 */
export function parseCssPx(raw: unknown): number | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  const m = /^(\d+(?:\.\d+)?)px$/i.exec(v);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/**
 * 预览态 fill/hug 的有效 layout 可用宽：min(版心配置宽, 预览视窗宽)。
 * fixed 子级仍用配置 px，超出部分由父级/视窗 overflow 裁切。
 */
export function resolveEffectiveLayoutWidth(params: {
  rootConfiguredWidthPx: number;
  previewViewportPx: number;
}): number {
  const root = Math.max(0, params.rootConfiguredWidthPx);
  const viewport = Math.max(0, params.previewViewportPx);
  return Math.min(root, viewport);
}

export type ResolveWrapperWidthCssParams = {
  mode: unknown;
  fixedWidth?: unknown;
  fallbackMode?: "hug" | "fill";
};

/** wrapperStyle / 块外壳宽度 → CSS（fixed 不输出 maxWidth） */
export function resolveWrapperWidthCss(
  params: ResolveWrapperWidthCssParams
): Pick<CSSProperties, "width" | "maxWidth"> {
  const mode = normalizeWrapperDimensionMode(params.mode, params.fallbackMode ?? "fill");
  if (mode === "fill") {
    return { width: "100%" };
  }
  if (mode === "fixed") {
    const w = typeof params.fixedWidth === "string" ? params.fixedWidth.trim() : "";
    return w ? { width: w } : {};
  }
  return { width: "auto", maxWidth: "100%" };
}

export type ResolveWrapperHeightCssParams = {
  mode: unknown;
  fixedHeight?: unknown;
  fallbackMode?: "hug" | "fill";
};

/** wrapperStyle 高度 → CSS（fixed 不输出 maxHeight） */
export function resolveWrapperHeightCss(
  params: ResolveWrapperHeightCssParams
): Pick<CSSProperties, "height"> {
  const mode = normalizeWrapperDimensionMode(params.mode, params.fallbackMode ?? "hug");
  if (mode === "fill") {
    return { height: "100%" };
  }
  if (mode === "fixed") {
    const h = typeof params.fixedHeight === "string" ? params.fixedHeight.trim() : "";
    return h ? { height: h } : {};
  }
  return {};
}

/** 叶子块内核宽（button/image/text 等 props 上的 widthMode） */
export function resolveComponentBodyWidthCss(
  params: ResolveWrapperWidthCssParams & { defaultMode: "hug" | "fill" }
): Pick<CSSProperties, "display" | "width" | "maxWidth"> {
  const mode = normalizeWrapperDimensionMode(params.mode, params.defaultMode);
  if (mode === "fill") {
    return { display: "block", width: "100%" };
  }
  if (mode === "fixed") {
    const width = typeof params.fixedWidth === "string" ? params.fixedWidth.trim() : "";
    return { display: "block", ...(width ? { width } : {}) };
  }
  return { display: "inline-block", maxWidth: "100%" };
}

/** emailRoot 内容区外壳：配置宽 strict fixed + 块级裁切 */
export function resolveEmailRootShellCss(params: {
  configuredWidth: string;
}): Pick<CSSProperties, "width" | "overflow" | "boxSizing"> {
  const w = params.configuredWidth.trim();
  return {
    width: w || undefined,
    overflow: PREVIEW_BLOCK_OVERFLOW,
    boxSizing: "border-box",
  };
}

/** 预览视窗裁切容器（桌面/移动切换注入；不写 template.json） */
export function resolvePreviewViewportClipCss(previewViewportPx: number): CSSProperties {
  return {
    width: previewViewportPx,
    maxWidth: "100%",
    margin: "0 auto",
    overflow: PREVIEW_BLOCK_OVERFLOW,
  };
}

/** 块外壳统一 overflow（与 PREVIEW_BLOCK_OVERFLOW 一致） */
export function canvasShellOverflowCss(): Pick<CSSProperties, "overflow"> {
  return { overflow: PREVIEW_BLOCK_OVERFLOW };
}

/** hug 宽在满宽父槽位内的 maxWidth 上限（表格槽位与叶壳共用） */
export function hugWidthMaxWidthCapCss(): Pick<CSSProperties, "maxWidth"> {
  return { maxWidth: "100%" };
}

/**
 * 预览视窗窄于版心时，emailRoot 外壳仍保持配置宽（如 600px），内容在视窗内裁切。
 * 此时根选中描边应画在视窗层（可见区域），而非被 overflow 裁掉的根外壳上。
 */
export function isPreviewViewportNarrowerThanRoot(
  previewViewportPx: number,
  rootConfiguredWidthPx: number
): boolean {
  return previewViewportPx < rootConfiguredWidthPx;
}
