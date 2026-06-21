import {
  createDoubaoClientWithProfile,
  createDoubaoRawClientWithProfile,
  doubaoRuntimeFromProfile,
} from "./adapters/doubaoClient";
import { createGeminiClient, createGeminiRawClient } from "./adapters/geminiClient";
import type { LlmProfileSelection } from "../../layout-variant-ai-contract/llmProfileCatalog";
import {
  getDefaultThinkingForModel,
  type GeminiThinkingLevel,
} from "../../layout-variant-ai-contract/llmProfileCatalog";
import {
  mergeLlmGenerationParams,
  readDefaultLlmGenerationParams,
  type LlmGenerationParams,
} from "../../layout-variant-ai-contract/llmGenerationParams";
import { readDoubaoEnvConfigOrNull, readGeminiEnvConfigOrNull, readLlmPipelineVendor } from "./llmVendorConfig";
import type { LlmClient } from "./ports/LlmClient";
import { AI_PIPELINE_STEP_TIMEOUT_MS } from "../../layout-variant-ai-contract/constants";

export type CreateLlmClientOptions = {
  timeoutMs?: number;
  /** JSON 输出（默认，响应后 parseLlmJson）；raw 用于 mjs 等长文本。 */
  outputMode?: "json" | "raw";
  /** 厂商无关采样参数；未传字段走环境默认（LLM_PIPELINE_TEMPERATURE 等）。 */
  generationParams?: Partial<LlmGenerationParams>;
  profile?: LlmProfileSelection;
  /** @deprecated 使用 generationParams.maxOutputTokens */
  maxTokens?: number;
};

function resolveGenerationParams(options: CreateLlmClientOptions): LlmGenerationParams {
  const base = readDefaultLlmGenerationParams();
  const fromOptions = options.generationParams ?? {};
  const maxOutputTokens =
    fromOptions.maxOutputTokens ?? options.maxTokens ?? base.maxOutputTokens;
  return mergeLlmGenerationParams(base, { ...fromOptions, maxOutputTokens });
}

function geminiRuntimeFromProfile(profile: LlmProfileSelection) {
  return {
    model: profile.model,
    thinkingLevel: profile.thinking as GeminiThinkingLevel,
  };
}

function createLlmClientForProfile(
  profile: LlmProfileSelection,
  options: CreateLlmClientOptions = {}
): LlmClient {
  const timeoutMs = options.timeoutMs ?? AI_PIPELINE_STEP_TIMEOUT_MS;
  const generationParams = resolveGenerationParams(options);
  switch (profile.vendor) {
    case "doubao":
      if (options.outputMode === "raw") {
        return createDoubaoRawClientWithProfile(timeoutMs, {
          runtime: doubaoRuntimeFromProfile(profile),
          generationParams,
        });
      }
      return createDoubaoClientWithProfile({
        timeoutMs,
        runtime: doubaoRuntimeFromProfile(profile),
        generationParams,
      });
    case "gemini": {
      const runtime = geminiRuntimeFromProfile(profile);
      if (options.outputMode === "raw") {
        return createGeminiRawClient({ timeoutMs, runtime, generationParams });
      }
      return createGeminiClient({ timeoutMs, runtime, generationParams });
    }
    default: {
      const _exhaustive: never = profile.vendor;
      return _exhaustive;
    }
  }
}

function defaultProfileFromEnv(): LlmProfileSelection {
  const doubao = readDoubaoEnvConfigOrNull();
  if (doubao) {
    return {
      vendor: "doubao",
      model: doubao.model,
      thinking: getDefaultThinkingForModel("doubao", doubao.model),
    };
  }
  const gemini = readGeminiEnvConfigOrNull();
  if (gemini) {
    return { vendor: "gemini", model: gemini.model, thinking: "low" };
  }
  throw new Error("未配置 DOUBAO_API_KEY 或 GEMINI_API_KEY");
}

function createLlmClientForVendor(
  vendor: ReturnType<typeof readLlmPipelineVendor>,
  options: CreateLlmClientOptions = {}
): LlmClient {
  if (options.profile) {
    return createLlmClientForProfile(options.profile, options);
  }
  const profile: LlmProfileSelection =
    vendor === "gemini"
      ? {
          vendor: "gemini",
          model: readGeminiEnvConfigOrNull()?.model ?? "gemini-3.5-flash",
          thinking: "low",
        }
      : defaultProfileFromEnv();
  return createLlmClientForProfile(profile, options);
}

/** 按 profile 或环境变量创建 LLM 客户端（生产路径入口）。 */
export function createLlmClientFromProfile(
  profile: LlmProfileSelection,
  options?: Omit<CreateLlmClientOptions, "profile">
): LlmClient {
  return createLlmClientForProfile(profile, { ...options, profile });
}

/** 按 LLM_PIPELINE_VENDOR 创建默认 LLM 客户端。 */
export function createDefaultLlmClient(
  timeoutMs?: number,
  profile?: LlmProfileSelection
): LlmClient {
  return createLlmClientForVendor(readLlmPipelineVendor(), {
    timeoutMs,
    outputMode: "json",
    profile,
  });
}

export function createDefaultLlmRawClient(
  timeoutMs?: number,
  options?: Pick<CreateLlmClientOptions, "generationParams" | "maxTokens" | "profile">
): LlmClient {
  return createLlmClientForVendor(readLlmPipelineVendor(), {
    timeoutMs,
    outputMode: "raw",
    generationParams: options?.generationParams,
    maxTokens: options?.maxTokens,
    profile: options?.profile,
  });
}

export function createDefaultLlmClientOrNull(): LlmClient | null {
  if (readDoubaoEnvConfigOrNull()) {
    return createDefaultLlmClient();
  }
  if (readGeminiEnvConfigOrNull()) {
    return createDefaultLlmClient(undefined, {
      vendor: "gemini",
      model: readGeminiEnvConfigOrNull()!.model,
      thinking: "low",
    });
  }
  return null;
}
