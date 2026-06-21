/**
 * LLM 采样与输出长度参数（厂商无关；由 adapters 映射到各自 API 字段名）。
 * 与 LlmProfileSelection（厂商/模型/thinking）分离；与 RestoreAst json_schema 门控分离。
 */

export type LlmGenerationParams = {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
};

/** 管线默认采样参数（豆包 / Gemini 共用；可用环境变量覆盖）。 */
export const DEFAULT_LLM_GENERATION_PARAMS: LlmGenerationParams = {
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 8192,
};

function parseEnvFloat(name: string): number | undefined {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseEnvInt(name: string): number | undefined {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function mergeLlmGenerationParams(
  base: LlmGenerationParams,
  override?: Partial<LlmGenerationParams>
): LlmGenerationParams {
  if (!override) return { ...base };
  return {
    temperature: override.temperature ?? base.temperature,
    topP: override.topP ?? base.topP,
    maxOutputTokens: override.maxOutputTokens ?? base.maxOutputTokens,
  };
}

/** 读取环境变量覆盖后的默认生成参数（`LLM_PIPELINE_TEMPERATURE` 等）。 */
export function readDefaultLlmGenerationParams(): LlmGenerationParams {
  return mergeLlmGenerationParams(DEFAULT_LLM_GENERATION_PARAMS, {
    temperature: parseEnvFloat("LLM_PIPELINE_TEMPERATURE"),
    topP: parseEnvFloat("LLM_PIPELINE_TOP_P"),
    maxOutputTokens: parseEnvInt("LLM_PIPELINE_MAX_OUTPUT_TOKENS"),
  });
}
