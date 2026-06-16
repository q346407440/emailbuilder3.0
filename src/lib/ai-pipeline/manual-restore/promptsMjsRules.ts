/**
 * mjs 各阶段 prompt 复用的硬规则单一真源。
 * 视觉质量门规则须与 mjsVisualLint 的 issue code 对应，避免「prompt 要求」与「lint 拦截」漂移。
 */

import { EMAIL_CONTAINER_SPACING_MAX_PX } from "../../spacingPxCap";

/** 视觉质量门：与 mjsVisualLint（asset.placeholderSrc / layout.defaultSizeLikelyCopied / typography.footerTooLarge / icon.missingBox / divider.strokeUsedAsDivider）对应。 */
export const MJS_VISUAL_QUALITY_RULES = [
  "禁止空字符串或 `#` 图片/图标源；品牌 Logo / App glyph 等必需资产必须引用真实 PEXELS/ICON 解析结果。",
  "禁止无依据默认大值：`48px`、`32px`、`16px`、`480px`、`100px`、`gap: '48px'` 必须能在 blueprint 找到依据。",
  "页脚 / 合规文字使用 caption 级字号（通常 6-8px），勿沿用正文字号。",
  "社媒图标若有圆/方外框，用底稿 `iconBadge` 助手（fixed 容器 + border + 居中 icon），禁止裸 icon、禁止手写外框容器。",
  "分隔线用独立 divider 或明确 box-border，禁止用整段 section stroke 模糊替代 top/bottom 线。",
] as const;

/** template 树字面量约束：delta / generate / patch 共用。 */
export const MJS_TEMPLATE_LITERAL_RULES = [
  "template 树只用 COLORS + 字面量 px，禁止 `$themeRef` / `bindings` / `themeRef()`（程序也会自动 literalize）。",
  "禁止 `props.mainAlign` / `props.crossAlign` / `props.justify`；横排对齐用 `direction:'horizontal'` + `wrapperStyle.contentAlign`。",
  "ICON 连字符槽用括号访问 `ICON[\"icon-instagram\"]`，禁止 `ICON.icon-instagram`（运行失败）。",
  "button 外层 `wrapperStyle.heightMode` 必须 `hug`，禁止定高裁切胶囊文案。",
  "block id 必须为静态模板字符串（如 `${P}-s7-ig-wrapper`），禁止在 id 内嵌套变量拼接（如 `${P}-s7-${x}-wrapper`）——程序定位与修复依赖 id 字面可寻址。",
  `tokenPresets.spacing 各档位与容器间距不得超过 ${EMAIL_CONTAINER_SPACING_MAX_PX}px（契约上限）；设计图留白更大时取 ${EMAIL_CONTAINER_SPACING_MAX_PX}px。`,
  "父级 layout/image 某轴为 hug 时，子级同轴禁止 fill（循环依赖；高度轴仅纵排父级触发）。手写 `widthMode:'hug'` 容器内的 textBlock 等子块必须显式传 `widthMode:'hug'`（textBlock 默认 fill）。",
  "每个非根 layout/grid 块的 `wrapperStyle.contentAlign` 两轴必填（horizontal: left/center/right；vertical: top/center/bottom）。",
  "`widthMode`/`heightMode` 为 `fixed` 时必须同时给出对应 `width`/`height` 字面 px 值。",
] as const;

function bullets(rules: readonly string[]): string {
  return rules.map((rule) => `- ${rule}`).join("\n");
}

/** 视觉质量门小节（标题 + 规则）。 */
export function buildMjsVisualQualitySection(): string {
  return `## 视觉质量门\n${bullets(MJS_VISUAL_QUALITY_RULES)}`;
}

/** template 字面量约束小节。 */
export function buildMjsTemplateLiteralSection(): string {
  return `## template 字面量与对齐硬规则\n${bullets(MJS_TEMPLATE_LITERAL_RULES)}`;
}
