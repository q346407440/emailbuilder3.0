import type { LlmClient, LlmMessage, LlmResponseFormat } from "../ports/LlmClient";

export type MockLlmFixtures = Partial<Record<string, unknown>>;

const FIXTURE_KEYS = [
  "grounding_result_v1",
  "style_tokens_v1",
  "icon_query_list_v1",
  "text_extract_v1",
  "compact_section_tree_v1",
] as const;

function readMessageText(message: LlmMessage): string {
  const { content } = message;
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/** 无 json_schema 时按 system prompt 关键词路由 fixture。 */
function resolveFixtureKey(messages: LlmMessage[], responseFormat?: LlmResponseFormat): string {
  const schemaName = responseFormat?.json_schema?.name;
  if (schemaName) return schemaName;

  const systemText = messages.find((m) => m.role === "system")?.content;
  const system = typeof systemText === "string" ? systemText : readMessageText({ role: "system", content: systemText ?? "" });

  if (system.includes("邮件模板分析") || system.includes("版式分区")) return "grounding_result_v1";
  if (system.includes("设计分析") || system.includes("设计风格")) return "style_tokens_v1";
  if (system.includes("图标识别")) return "icon_query_list_v1";
  if (system.includes("文本提取") || system.includes("文案提取")) return "text_extract_v1";
  if (system.includes("结构生成") || system.includes("compact 区块树") || system.includes("邮件结构"))
    return "compact_section_tree_v1";

  return "grounding_result_v1";
}

/** 单测 fixture 驱动 LLM 替身。 */
export function createMockLlmClient(fixtures: MockLlmFixtures): LlmClient {
  return {
    async complete(messages: LlmMessage[], responseFormat?: LlmResponseFormat): Promise<string> {
      const name = resolveFixtureKey(messages, responseFormat);
      const fixture =
        fixtures[name] ??
        fixtures.default ??
        fixtures["grounding_result_v1"];
      if (fixture == null) {
        throw new Error(`mockLlmClient 缺少 fixture：${name}`);
      }
      return JSON.stringify(fixture);
    },
  };
}

export { FIXTURE_KEYS };
