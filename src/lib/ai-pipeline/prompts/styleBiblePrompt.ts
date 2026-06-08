import type { NormalizedStyleTokens } from "../types";

/** Stage C 全局 Style Bible：约束 primary 语义，避免 wordmark/正文误用按钮色。 */
export function buildStyleBiblePromptSection(styleTokens: NormalizedStyleTokens): string {
  return `## Global Style Bible（全邮件统一；本区结构须遵守）

- **colors.primary（${styleTokens.colors.primary}）**：仅用于 **action.button 背景** 或设计图里「与 CTA 同色块」的强调底；**禁止**用于 wordmark、标题、正文、商品名（应使用 **#1A1A1A** 或 colors.secondary）
- **CTA 按钮文字**：黄/浅底按钮用 **#1A1A1A**；深底按钮用 **#FFFFFF**（写在 styleKeys \`buttonStyle.textColor\` 或省略由程序按 primary 推断）
- **弱化文案 / 页脚**：colors.secondary 或 #6B7280 档
- **页头引导链**（如 Book a test ride）：用 **content.text** + decoration: underline，**禁止** action.button
- **gridColumns**（若区域分析有）：仅为提示；本区若可见 N 个并列资产槽，layout.grid 的 columns 应与视觉一致（信任/社交常见 4）
- typography 档位（仅 px）：display ${styleTokens.typography.display} / h1 ${styleTokens.typography.h1} / body ${styleTokens.typography.body} / caption ${styleTokens.typography.caption}`;
}
