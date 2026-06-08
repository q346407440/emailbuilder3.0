import type { WrapperBackgroundContentAlign, WrapperContentAlign } from "../types/email";

/** 容器内内容默认分布；新模板会显式写入 wrapperStyle.contentAlign。 */
export const PROJECT_LAYOUT_CONTENT_ALIGN: WrapperContentAlign = {
  horizontal: "left",
  vertical: "top",
};

/** 底图叠放层默认对齐（不写 JSON；叠放区用容器 contentAlign 或嵌套 layout） */
export const PROJECT_BACKGROUND_CONTENT_ALIGN: WrapperBackgroundContentAlign = {
  horizontal: "left",
  vertical: "top",
};

export const PROJECT_TEXT_CONTENT_ALIGN_VERTICAL = "top" as const;

export type LayoutStackDirection = "horizontal" | "vertical";

export function normalizeLayoutStackDirection(raw: unknown): LayoutStackDirection {
  return raw === "horizontal" ? "horizontal" : "vertical";
}

/** 按钮胶囊内边距 */
export const BUTTON_INNER_PADDING = "8px 12px";

/** 按钮胶囊行高（须在 td anti-strut line-height:0 下显式写入，否则垂直 padding 不生效） */
export const BUTTON_INNER_LINE_HEIGHT = "normal";

/** 图片 / 容器背景图加载前或透明区域兜底色 */
export const IMAGE_BACKGROUND_FALLBACK_COLOR = "#f0f0f0";

/** 文本块行高（画布预览） */
export const FIXED_TEXT_LINE_HEIGHT = "1.3";

/** 邮件画布文本渲染用 font-family（非 JSON 配置项） */
export const EMAIL_CANVAS_TEXT_FONT_FAMILY = "Arial, sans-serif";

/** 画布根节点内容区固定宽度（校验、规范化默认值、预览与 Inspector 共用真源） */
export const EMAIL_ROOT_FIXED_WIDTH = "600px";

/** 画布工作区外侧底色（项目级固定，不写入 template.json；预览与 `.canvas-col` 共用）。 */
export const EMAIL_CANVAS_WORKSPACE_BACKGROUND = "#f1f1f1";

/** 与 `validateTemplate` 中 `blocks.*.props.width` 报错文案一致，供 Inspector 内联黄条复用 */
export function emailRootWidthMismatchReason(current: unknown): string {
  const cur =
    current === undefined || current === null
      ? "（缺失）"
      : typeof current === "string" && !current.trim()
        ? "（空）"
        : String(current);
  return `必须为 ${EMAIL_ROOT_FIXED_WIDTH}（唯一真源 EMAIL_ROOT_FIXED_WIDTH），当前为 ${cur}`;
}

/** 预览层块级裁切（wrapperStyle.overflow 禁止写 JSON 时的等效行为） */
export const PREVIEW_BLOCK_OVERFLOW = "hidden" as const;

export const RENDER_DEFAULT_VALUES = {
  PROJECT_LAYOUT_CONTENT_ALIGN,
  PROJECT_BACKGROUND_CONTENT_ALIGN,
  PROJECT_TEXT_CONTENT_ALIGN_VERTICAL,
  BUTTON_INNER_PADDING,
  BUTTON_INNER_LINE_HEIGHT,
  IMAGE_BACKGROUND_FALLBACK_COLOR,
  FIXED_TEXT_LINE_HEIGHT,
  EMAIL_ROOT_FIXED_WIDTH,
  PREVIEW_BLOCK_OVERFLOW,
} as const;

/**
 * 容器内容九宫格：横向与纵向均可显式持久化；缺失时回退 left/top。
 */
export function projectLayoutContentAlign(
  direction: unknown,
  raw?: WrapperContentAlign | null
): WrapperContentAlign {
  void direction;
  const horizontal =
    raw?.horizontal === "left" || raw?.horizontal === "center" || raw?.horizontal === "right"
      ? raw.horizontal
      : PROJECT_LAYOUT_CONTENT_ALIGN.horizontal;
  const vertical =
    raw?.vertical === "top" || raw?.vertical === "center" || raw?.vertical === "bottom"
      ? raw.vertical
      : PROJECT_LAYOUT_CONTENT_ALIGN.vertical;
  return { horizontal, vertical };
}

export function projectBackgroundContentAlign(): WrapperBackgroundContentAlign {
  return PROJECT_BACKGROUND_CONTENT_ALIGN;
}

export function projectTextContentAlign(
  raw?: WrapperContentAlign | null
): WrapperContentAlign {
  const horizontal =
    raw?.horizontal === "left" || raw?.horizontal === "center" || raw?.horizontal === "right"
      ? raw.horizontal
      : "left";
  return { horizontal, vertical: PROJECT_TEXT_CONTENT_ALIGN_VERTICAL };
}
