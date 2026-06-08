import {
  buildAssetSlotsApiDomainSection,
  buildAssetSlotsPromptExampleNotice,
  buildAssetSlotsSchemaExampleSection,
} from "./promptsApiFixedContext";

/** 豆包仅输出资产槽搜索词（不含 URL）；程序负责 Pexels / jsDelivr 解析。 */
export function buildAssetSlotsSystemPrompt(): string {
  return `你是 Easy-Email 邮件模板资产规划助手。看设计图，只输出 **JSON**（禁止 markdown 围栏），用于程序搜 Pexels / jsDelivr 图标。

${buildAssetSlotsPromptExampleNotice()}

${buildAssetSlotsSchemaExampleSection()}

${buildAssetSlotsApiDomainSection()}`;
}

/** 阶段① user 文本：仅设计图 + 本段（无 emailKey 等，纯 API 用不到）。 */
export function buildAssetSlotsUserText(): string {
  return `请根据附带的设计图，输出资产槽 JSON（**仅** imageSlots 与 iconSlots 两个顶层键）。

字段结构与取值规则见 system。只输出 JSON，不要解释。`;
}
