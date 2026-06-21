/** 管线 LLM 厂商（由环境变量 LLM_PIPELINE_VENDOR 选择）。 */
export type LlmPipelineVendor = "doubao" | "gemini";

const DEFAULT_DOUBAO_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

export type OpenAiCompatibleLlmEnvConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type GeminiEnvConfig = {
  apiKey: string;
  model: string;
};

const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export function readLlmPipelineVendor(): LlmPipelineVendor {
  const raw = (process.env.LLM_PIPELINE_VENDOR ?? "doubao").trim().toLowerCase();
  if (raw === "gemini") return "gemini";
  return "doubao";
}

/** 豆包 / 火山方舟 Ark（OpenAI 兼容 chat/completions）。 */
export function readDoubaoEnvConfig(): OpenAiCompatibleLlmEnvConfig {
  const apiKey = (process.env.DOUBAO_API_KEY ?? "").trim();
  const baseUrl = (process.env.DOUBAO_BASE_URL ?? DEFAULT_DOUBAO_BASE_URL).trim();
  const model = (process.env.LLM_PIPELINE_MODEL ?? "").trim();
  if (!apiKey || !model) {
    throw new Error("未配置 DOUBAO_API_KEY 或 LLM_PIPELINE_MODEL");
  }
  return { apiKey, baseUrl, model };
}

export function readDoubaoEnvConfigOrNull(): OpenAiCompatibleLlmEnvConfig | null {
  const apiKey = (process.env.DOUBAO_API_KEY ?? "").trim();
  const model = (process.env.LLM_PIPELINE_MODEL ?? "").trim();
  if (!apiKey || !model) return null;
  const baseUrl = (process.env.DOUBAO_BASE_URL ?? DEFAULT_DOUBAO_BASE_URL).trim();
  return { apiKey, baseUrl, model };
}

/** Gemini Generate Content API。 */
export function readGeminiEnvConfig(modelOverride?: string): GeminiEnvConfig {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const model = (modelOverride?.trim() || process.env.GEMINI_PIPELINE_MODEL?.trim() || "gemini-3.5-flash").trim();
  if (!apiKey) {
    throw new Error("未配置 GEMINI_API_KEY");
  }
  return { apiKey, model };
}

export function readGeminiEnvConfigOrNull(): GeminiEnvConfig | null {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) return null;
  const model = (process.env.GEMINI_PIPELINE_MODEL ?? "gemini-3.5-flash").trim();
  return { apiKey, model };
}

export function geminiGenerateContentUrl(model: string): string {
  return `${DEFAULT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;
}
