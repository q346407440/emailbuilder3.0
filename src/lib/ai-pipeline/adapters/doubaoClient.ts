import type { LlmClient, LlmMessage, LlmResponseFormat, LlmStreamHandlers } from "../ports/LlmClient";
import { parseLlmJson } from "../parseLlmJson";
import {
  AI_PIPELINE_STEP_TIMEOUT_MS,
  RESTORE_AST_GENERATE_ABSOLUTE_TIMEOUT_MS,
  RESTORE_AST_LLM_STREAM_IDLE_TIMEOUT_MS,
} from "../../../layout-variant-ai-contract/constants";
import type {
  DoubaoReasoningEffort,
  DoubaoThinkingType,
  LlmProfileSelection,
} from "../../../layout-variant-ai-contract/llmProfileCatalog";
import {
  getDefaultThinkingForModel,
  isDoubaoSeed20CatalogModel,
} from "../../../layout-variant-ai-contract/llmProfileCatalog";
import type { LlmGenerationParams } from "../../../layout-variant-ai-contract/llmGenerationParams";
import { readDefaultLlmGenerationParams } from "../../../layout-variant-ai-contract/llmGenerationParams";
import { readDoubaoEnvConfig, readDoubaoEnvConfigOrNull } from "../llmVendorConfig";
import { toOpenAiCompatibleGenerationFields } from "../llmGenerationParamsApply";
import {
  OpenAiChatCompletionsError,
  postOpenAiChatCompletionsOnce,
  postOpenAiChatCompletionsWithBodyVariants,
  type PostOpenAiChatCompletionsOptions,
} from "./openAiCompatibleChat";
import {
  postOpenAiChatCompletionsStream,
  type PostOpenAiChatCompletionsStreamOptions,
} from "./openAiCompatibleChatStream";
import {
  buildDoubaoResponseFormatBodies,
  isDoubaoResponseFormatUnsupported,
} from "./doubaoResponseFormat";

const DOUBAO_VENDOR_LABEL = "豆包";

const DOUBAO_REASONING_EFFORTS: readonly DoubaoReasoningEffort[] = [
  "minimal",
  "low",
  "medium",
  "high",
];

export type DoubaoClientRuntimeConfig = {
  model: string;
  thinkingType: DoubaoThinkingType;
  reasoningEffort?: DoubaoReasoningEffort;
};

function normalizeDoubaoReasoningEffort(raw: string | undefined): DoubaoReasoningEffort {
  const normalized = raw?.trim() ?? "";
  if (DOUBAO_REASONING_EFFORTS.includes(normalized as DoubaoReasoningEffort)) {
    return normalized as DoubaoReasoningEffort;
  }
  return "low";
}

/** 豆包 Chat Completions 专有扩展（thinking + reasoning_effort）。 */
export function buildDoubaoChatCompletionsExtensions(
  runtime: DoubaoClientRuntimeConfig
): Record<string, unknown> {
  if (runtime.thinkingType === "disabled") {
    return { thinking: { type: "disabled" } };
  }
  return {
    thinking: { type: "enabled" },
    reasoning_effort: runtime.reasoningEffort ?? "low",
  };
}

function doubaoPostOptions(
  timeoutMs: number,
  runtime: DoubaoClientRuntimeConfig
): PostOpenAiChatCompletionsOptions {
  return {
    timeoutMs,
    vendorLabel: DOUBAO_VENDOR_LABEL,
    augmentBaseBody: () => buildDoubaoChatCompletionsExtensions(runtime),
  };
}

function resolveDoubaoApiConfig(runtime: DoubaoClientRuntimeConfig) {
  const env = readDoubaoEnvConfig();
  return { ...env, model: runtime.model.trim() || env.model };
}

export type CreateDoubaoClientOptions = {
  timeoutMs?: number;
  runtime: DoubaoClientRuntimeConfig;
  generationParams: LlmGenerationParams;
  /** 流式 idle / 绝对超时；RestoreAst 传入，其余走默认。 */
  streamIdleTimeoutMs?: number;
  streamAbsoluteTimeoutMs?: number;
};

function doubaoStreamPostOptions(
  runtime: DoubaoClientRuntimeConfig,
  handlers: LlmStreamHandlers,
  streamIdleTimeoutMs = RESTORE_AST_LLM_STREAM_IDLE_TIMEOUT_MS,
  streamAbsoluteTimeoutMs = RESTORE_AST_GENERATE_ABSOLUTE_TIMEOUT_MS
): PostOpenAiChatCompletionsStreamOptions {
  return {
    vendorLabel: DOUBAO_VENDOR_LABEL,
    idleTimeoutMs: streamIdleTimeoutMs,
    absoluteTimeoutMs: streamAbsoluteTimeoutMs,
    augmentBaseBody: () => buildDoubaoChatCompletionsExtensions(runtime),
    onDelta: handlers.onDelta,
  };
}

async function doubaoCompleteStream(
  runtime: DoubaoClientRuntimeConfig,
  generation: ReturnType<typeof toOpenAiCompatibleGenerationFields>,
  messages: LlmMessage[],
  responseFormat: LlmResponseFormat | undefined,
  handlers: LlmStreamHandlers,
  options: Pick<CreateDoubaoClientOptions, "streamIdleTimeoutMs" | "streamAbsoluteTimeoutMs">
): Promise<string> {
  const config = resolveDoubaoApiConfig(runtime);
  const request = {
    model: config.model,
    messages,
    ...generation,
  };
  const formatVariants = buildDoubaoResponseFormatBodies(responseFormat);
  const variants = formatVariants.length > 0 ? formatVariants : [{}];
  let lastError: Error | null = null;

  for (let i = 0; i < variants.length; i += 1) {
    try {
      const content = await postOpenAiChatCompletionsStream(
        config,
        request,
        doubaoStreamPostOptions(
          runtime,
          handlers,
          options.streamIdleTimeoutMs,
          options.streamAbsoluteTimeoutMs
        ),
        variants[i]!,
        i + 1
      );
      parseLlmJson(content);
      return content;
    } catch (e) {
      if (!(e instanceof OpenAiChatCompletionsError)) throw e;
      lastError = e;
      const status = e.status ?? 0;
      const canFallback =
        responseFormat != null &&
        i < variants.length - 1 &&
        isDoubaoResponseFormatUnsupported(status, e.message);
      if (!canFallback) throw e;
    }
  }

  throw lastError ?? new OpenAiChatCompletionsError(`${DOUBAO_VENDOR_LABEL} 流式 API 调用失败`);
}

export function createDoubaoClientWithProfile(options: CreateDoubaoClientOptions): LlmClient {
  const timeoutMs = options.timeoutMs ?? AI_PIPELINE_STEP_TIMEOUT_MS;
  const runtime = options.runtime;
  const generation = toOpenAiCompatibleGenerationFields(options.generationParams);
  return {
    async complete(messages: LlmMessage[], responseFormat?: LlmResponseFormat): Promise<string> {
      const config = resolveDoubaoApiConfig(runtime);
      const request = {
        model: config.model,
        messages,
        ...generation,
      };
      const formatVariants = buildDoubaoResponseFormatBodies(responseFormat);
      const content = await postOpenAiChatCompletionsWithBodyVariants(
        config,
        request,
        doubaoPostOptions(timeoutMs, runtime),
        formatVariants,
        {
          shouldFallback: (status, message, attemptIndex, totalAttempts) =>
            responseFormat != null &&
            attemptIndex < totalAttempts - 1 &&
            isDoubaoResponseFormatUnsupported(status, message),
        }
      );
      parseLlmJson(content);
      return content;
    },
    async completeStream(
      messages: LlmMessage[],
      responseFormat: LlmResponseFormat | undefined,
      handlers: LlmStreamHandlers
    ): Promise<string> {
      return doubaoCompleteStream(runtime, generation, messages, responseFormat, handlers, options);
    },
  };
}

export type DoubaoRawClientOptions = {
  runtime: DoubaoClientRuntimeConfig;
  generationParams: LlmGenerationParams;
};

export function createDoubaoRawClientWithProfile(
  timeoutMs = AI_PIPELINE_STEP_TIMEOUT_MS,
  options: DoubaoRawClientOptions
): LlmClient {
  return {
    async complete(messages: LlmMessage[], _responseFormat?: LlmResponseFormat): Promise<string> {
      const config = resolveDoubaoApiConfig(options.runtime);
      const request = {
        model: config.model,
        messages,
        ...toOpenAiCompatibleGenerationFields(options.generationParams),
      };
      return postOpenAiChatCompletionsOnce(
        config,
        request,
        doubaoPostOptions(timeoutMs, options.runtime)
      );
    },
  };
}

function doubaoRuntimeFromEnvModel(model: string): DoubaoClientRuntimeConfig {
  return doubaoRuntimeFromProfile({
    vendor: "doubao",
    model,
    thinking: getDefaultThinkingForModel("doubao", model),
  });
}

/** @deprecated 使用 createDoubaoClientWithProfile + LlmProfileSelection */
export function createDoubaoClient(timeoutMs = AI_PIPELINE_STEP_TIMEOUT_MS): LlmClient {
  const env = readDoubaoEnvConfig();
  return createDoubaoClientWithProfile({
    timeoutMs,
    runtime: doubaoRuntimeFromEnvModel(env.model),
    generationParams: readDefaultLlmGenerationParams(),
  });
}

/** @deprecated 使用 createDoubaoRawClientWithProfile */
export function createDoubaoRawClient(
  timeoutMs = AI_PIPELINE_STEP_TIMEOUT_MS,
  options?: { maxTokens?: number }
): LlmClient {
  const env = readDoubaoEnvConfig();
  const generationParams = options?.maxTokens
    ? { ...readDefaultLlmGenerationParams(), maxOutputTokens: options.maxTokens }
    : readDefaultLlmGenerationParams();
  return createDoubaoRawClientWithProfile(timeoutMs, {
    runtime: doubaoRuntimeFromEnvModel(env.model),
    generationParams,
  });
}

export function createDoubaoClientOrNull(): LlmClient | null {
  const env = readDoubaoEnvConfigOrNull();
  if (!env) return null;
  return createDoubaoClientWithProfile({
    runtime: doubaoRuntimeFromEnvModel(env.model),
    generationParams: readDefaultLlmGenerationParams(),
  });
}

export function doubaoRuntimeFromProfile(profile: LlmProfileSelection): DoubaoClientRuntimeConfig {
  const model = profile.model.trim();
  if (isDoubaoSeed20CatalogModel(model)) {
    return {
      model,
      thinkingType: "enabled",
      reasoningEffort: normalizeDoubaoReasoningEffort(profile.thinking),
    };
  }
  return {
    model,
    thinkingType: "disabled",
  };
}
