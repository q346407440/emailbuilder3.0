/**
 * mjs 各阶段 prompt 复用的硬规则单一真源。
 * 视觉质量门规则须与 mjsVisualLint 的 issue code 对应，避免「prompt 要求」与「lint 拦截」漂移。
 */

/** 视觉质量门：与 mjsVisualLint（asset.placeholderSrc / layout.defaultSizeLikelyCopied / typography.footerTooLarge / icon.missingBox / divider.strokeUsedAsDivider）对应。 */
export const MJS_VISUAL_QUALITY_RULES = [
  "禁止空字符串或 `#` 图片/图标源；品牌 Logo / App glyph 等必需资产必须引用真实 PEXELS/ICON 解析结果。",
  "禁止无依据默认大值：`48px`、`32px`、`16px`、`480px`、`100px`、`gap: '48px'` 必须能在 blueprint 找到依据。",
  "页脚 / 合规文字使用 caption 级字号（通常 6-8px），勿沿用正文字号。",
  "社媒图标若有圆/方外框，必须用 fixed `layout.container` + border 包住 `iconBlock`，禁止裸 icon。",
  "分隔线用独立 divider 或明确 box-border，禁止用整段 section stroke 模糊替代 top/bottom 线。",
] as const;

/** template 树字面量约束：delta / generate / patch 共用。 */
export const MJS_TEMPLATE_LITERAL_RULES = [
  "template 树只用 COLORS + 字面量 px，禁止 `$themeRef` / `bindings` / `themeRef()`（程序也会自动 literalize）。",
  "禁止 `props.mainAlign` / `props.crossAlign` / `props.justify`；横排对齐用 `direction:'horizontal'` + `wrapperStyle.contentAlign`。",
  "ICON 连字符槽用括号访问 `ICON[\"icon-instagram\"]`，禁止 `ICON.icon-instagram`（运行失败）。",
  "button 外层 `wrapperStyle.heightMode` 必须 `hug`，禁止定高裁切胶囊文案。",
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
