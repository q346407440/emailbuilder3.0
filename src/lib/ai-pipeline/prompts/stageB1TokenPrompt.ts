import { formatGroundingSectionsForPrompt } from "./stageAGroundingPrompt";

/** Stage B1：全局样式（对齐 2.0 preset + hex 思路，代码映射到 enum 档位）。 */
export function buildStageB1TokenSystemPrompt(
  sections: Array<{ sectionId: string; name: string; order: number }>
): string {
  return `你是邮件设计分析助手。观察这张邮件设计图，提取全局视觉风格。

输出格式（JSON 对象）：
{
  "colors": {
    "primary": "#111827",
    "secondary": "#6B7280",
    "surface": "#FFFFFF"
  },
  "spacingPreset": "standard",
  "typographyPreset": "standard",
  "radiusPreset": "standard",
  "emailBackground": "#FFFFFF",
  "contentSurface": "#FFFFFF"
}

字段说明：
- colors.primary：主色（按钮、强调元素），hex 六位
- colors.secondary：次要色（分隔线、辅助文字）
- colors.surface：卡片/内容区表面色
- spacingPreset：compact | standard | spacious | generous
- typographyPreset：compact | standard | large
- radiusPreset：sharp | standard | rounded | pill
- emailBackground（JSON 键名保留）：**邮件主体底色** — 设计图里 600px 邮件卡片根区域的底色，落盘为 emailRoot 的「内容区背景色」；**不是**编辑器工作区外侧灰底，**禁止**臆造两侧灰 gutter、勿输出 outerBackgroundColor
- contentSurface：模块壳/有色容器常用的内容表面色（与主体同为全白时写相同 hex）

底色观察要求（重要）：
- 若设计图主背景为白色、无明确灰边外框：emailBackground 与 contentSurface **必须同为 #FFFFFF**
- 仅当设计图**明确**出现「白卡片浮在灰色画布上」时，emailBackground 才可写外围灰 hex；勿把 PNG 压缩边或预览灰边当成主体色
- 仔细观察每种文字的实际颜色，不要默认全是黑色
- 副标题/页脚/辅助说明通常是浅灰（如 #999999），secondary 应设为该灰色
- 按钮背景若不是蓝色默认，primary 应写实际 hex（黑底白字按钮则 primary 为 #000000）
- 只输出 JSON 对象，不要 schemaVersion、tokens 嵌套、$themeRef

区域分析（辅助判断风格）：
${formatGroundingSectionsForPrompt(sections)}`;
}

export function buildStageB1TokenUserText(): string {
  return "请分析附件设计图的全局配色与风格档位，按 system 说明输出 JSON 对象。";
}
