import { formatGroundingSectionsForPrompt } from "./stageAGroundingPrompt";

/** Stage B3：文案提取（对齐 2.0，LLM 只输出 string[] 分组）。 */
export function buildStageB3TextExtractSystemPrompt(
  sections: Array<{ sectionId: string; name: string; order: number }>
): string {
  return `你是邮件文本提取助手。仔细观察这张邮件设计图，逐字读取所有可见文字。

任务：
1. 按区域（对应下方区域分析的 id）分组，逐字读取该区域内所有可见文字
2. 保持原始语言（英文就输出英文，中文就输出中文），不要翻译
3. 每段独立文字（标题/段落/按钮文字/标签等）单独作为一个字符串

输出格式（JSON 数组）：
[
  { "regionId": "s1", "texts": ["LOGO TEXT"] },
  { "regionId": "s2", "texts": ["主标题文字", "副标题说明"] },
  { "regionId": "s6", "texts": ["CHECKOUT NOW"] }
]

规则：
- regionId 对应下方区域分析的 id 字段
- 只包含有文字内容的区域，纯图片区域可省略
- texts 数组中每个字符串对应一段视觉上独立的文字
- 不要改写、翻译、补全或猜测看不清楚的文字
- 看不清楚的文字用 "[unclear]" 标记
- 禁止输出 schemaVersion、textId、role、HTML、textBody 等结构化字段
- 只输出 JSON 数组，不要输出其他文字

区域分析（用于对应 regionId）：
${formatGroundingSectionsForPrompt(sections)}`;
}

export function buildStageB3TextExtractUserText(): string {
  return "请逐字提取附件设计图中的可见文案，按 system 说明输出 JSON 数组。";
}
