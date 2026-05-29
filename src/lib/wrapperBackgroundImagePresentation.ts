import type { CSSProperties } from "react";
import { imageObjectPositionCssForFit } from "./imageObjectPosition";

export type WrapperBackgroundImagePresentationFields = {
  src: string;
  alt?: string;
  fit?: unknown;
  position?: unknown;
};

/** CSS `url("…")` 字面量（发信 HTML 内联样式用） */
export function wrapperBackgroundImageCssUrl(src: string): string {
  const escaped = src.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}

/**
 * 底图容器 inner `<td>` 的邮件安全背景样式（`background-size` / `background-position`，不用 `object-fit` / 绝对定位叠层）。
 * 叠放画布布局（padding 语义、td align/valign、外层 omitPadding）见 `wrapperBackgroundImageCanvasLayout.ts`。
 */
export function wrapperBackgroundImageTdPresentationStyle(
  bg: WrapperBackgroundImagePresentationFields,
  options?: { height?: string; fallbackColor?: string }
): CSSProperties {
  const fit = bg.fit === "contain" ? "contain" : "cover";
  const height = options?.height?.trim();
  return {
    backgroundImage: wrapperBackgroundImageCssUrl(bg.src),
    backgroundSize: fit,
    backgroundPosition: imageObjectPositionCssForFit(bg.position, bg.fit),
    backgroundRepeat: "no-repeat",
    ...(height ? { height, minHeight: height } : {}),
    ...(options?.fallbackColor ? { backgroundColor: options.fallbackColor } : {}),
  };
}

/** 替代文本：部分客户端不读 td 背景，用隐藏文案兜底 */
export function wrapperBackgroundImageAltHiddenMarkup(alt: string | undefined): string | null {
  const text = typeof alt === "string" ? alt.trim() : "";
  if (!text) return null;
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")}</div>`;
}
