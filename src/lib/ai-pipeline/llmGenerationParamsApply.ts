import type { LlmGenerationParams } from "../../layout-variant-ai-contract/llmGenerationParams";

/** 豆包 / OpenAI 兼容 chat/completions 采样字段。 */
export function toOpenAiCompatibleGenerationFields(params: LlmGenerationParams): {
  temperature: number;
  top_p: number;
  max_tokens: number;
} {
  return {
    temperature: params.temperature,
    top_p: params.topP,
    max_tokens: params.maxOutputTokens,
  };
}

/** Gemini generateContent.generationConfig 采样字段（camelCase）。 */
export function toGeminiGenerationFields(
  params: LlmGenerationParams
): {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
} {
  return {
    temperature: params.temperature,
    topP: params.topP,
    maxOutputTokens: params.maxOutputTokens,
  };
}
