import {
  buildLlmProfileOptions,
  type LlmProfileOptionsPayload,
} from "../src/layout-variant-ai-contract/llmProfileCatalog";
import { readDoubaoEnvConfigOrNull, readGeminiEnvConfigOrNull } from "../src/lib/ai-pipeline/llmVendorConfig";

export function getAiPipelineLlmOptions(): LlmProfileOptionsPayload {
  const doubao = readDoubaoEnvConfigOrNull();
  return buildLlmProfileOptions({
    doubaoConfigured: doubao != null,
    doubaoEnvModelId: doubao?.model ?? null,
    geminiConfigured: readGeminiEnvConfigOrNull() != null,
  });
}
