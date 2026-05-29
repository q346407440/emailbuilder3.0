/**
 * 邮件 HTML 呈现契约（画布预览 DOM = 发信抓取 DOM 的唯一真源）。
 *
 * - 布局与对齐：仅用 `<table role="presentation">` + `align` / `valign` / `td` 背景，禁止 Flexbox。
 * - hug 高子块槽位 anti-strut（`line-height:0` / `font-size:0`）：`src/lib/emailPresentationLayout.ts` · `emailPresentationHugSlotAntiStrutStyle`。
 * - 发信导出：仅做 hug 实测烘焙与剥离画布标记；不得再靠二次 CSS 改写纠正布局。
 */

/** 与 EmailPreview / 发信 HTML 一致的 presentation 表属性 */
export const EMAIL_PRESENTATION_TABLE_HTML_ATTRS = {
  role: "presentation",
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
} as const;

/**
 * 预览 DOM 禁止出现的内联样式属性（发信防御性剥离亦以此为准）。
 * 画布若产出下列属性，说明未走 table 呈现层，属契约违规。
 */
export const EMAIL_PRESENTATION_FORBIDDEN_INLINE_STYLE_PROPERTIES = [
  "flex",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "justify-content",
  "align-items",
  "align-self",
  "gap",
  "row-gap",
  "column-gap",
  "inset",
  "object-fit",
  "object-position",
] as const;

/** `display` 在发信 HTML 中禁止取用的值 */
export const EMAIL_PRESENTATION_FORBIDDEN_DISPLAY_VALUES = ["flex", "inline-flex"] as const;

/** `position` 在发信 HTML 中禁止取用的值（叠放应改 td background / 邮件专用结构，不用 absolute 叠层） */
export const EMAIL_PRESENTATION_FORBIDDEN_POSITION_VALUES = ["absolute", "fixed"] as const;

export type EmailPresentationForbiddenInlineStyleProperty =
  (typeof EMAIL_PRESENTATION_FORBIDDEN_INLINE_STYLE_PROPERTIES)[number];
