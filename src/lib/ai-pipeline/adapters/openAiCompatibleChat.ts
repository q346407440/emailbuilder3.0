import type { LlmMessage } from "../ports/LlmClient";
import { appendLlmExchangeLog } from "../llmExchangeFileLog";
import type { OpenAiCompatibleLlmEnvConfig } from "../llmVendorConfig";

/** OpenAI Chat Completions 兼容请求体（不含厂商扩展字段）。 */
export type OpenAiChatCompletionsRequest = {
  model: string;
  messages: LlmMessage[];
  max_tokens?: number;
};

export type PostOpenAiChatCompletionsOptions = {
  timeoutMs: number;
  /** 错误文案中的厂商名，如「豆包」。 */
  vendorLabel: string;
  /**
   * 在基础 body 上追加厂商扩展（如豆包 thinking）。
   * 与 bodyVariants 解耦：variants 仅负责 response_format 等待变字段。
   */
  augmentBaseBody?: (base: OpenAiChatCompletionsRequest) => Record<string, unknown>;
};

export class OpenAiChatCompletionsError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenAiChatCompletionsError";
    this.status = status;
  }
}

export type ChatCompletionsFallbackPolicy = {
  shouldFallback: (
    status: number,
    responseText: string,
    attemptIndex: number,
    totalAttempts: number
  ) => boolean;
};

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

function mergeRequestBody(
  request: OpenAiChatCompletionsRequest,
  options: PostOpenAiChatCompletionsOptions,
  bodyExtensions: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...request,
    ...(options.augmentBaseBody?.(request) ?? {}),
    ...bodyExtensions,
  };
}

/** 单次 POST …/chat/completions（基础 OpenAI 兼容形态 + 可选扩展字段）。 */
export async function postOpenAiChatCompletionsOnce(
  config: OpenAiCompatibleLlmEnvConfig,
  request: OpenAiChatCompletionsRequest,
  options: PostOpenAiChatCompletionsOptions,
  bodyExtensions: Record<string, unknown> = {},
  httpAttempt = 1
): Promise<string> {
  const url = chatCompletionsUrl(config.baseUrl);
  const body = mergeRequestBody(request, options, bodyExtensions);

  appendLlmExchangeLog({
    type: "request",
    httpAttempt,
    url,
    body,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (e) {
    appendLlmExchangeLog({
      type: "error",
      httpAttempt,
      url,
      message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  const responseText = await res.text();
  let responseBody: unknown = responseText;
  try {
    responseBody = JSON.parse(responseText) as unknown;
  } catch {
    // 非 JSON 时保留原文
  }

  if (!res.ok) {
    appendLlmExchangeLog({
      type: "error",
      httpAttempt,
      url,
      status: res.status,
      message: `${options.vendorLabel} API ${res.status}`,
      body: responseBody,
    });
    throw new OpenAiChatCompletionsError(
      `${options.vendorLabel} API ${res.status}: ${responseText.slice(0, 400)}`,
      res.status
    );
  }

  appendLlmExchangeLog({
    type: "response",
    httpAttempt,
    url,
    status: res.status,
    body: responseBody,
  });

  const data = responseBody as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenAiChatCompletionsError(`${options.vendorLabel} 返回空 content`);
  }
  return content;
}

/**
 * 按 bodyVariants 顺序尝试多次请求（如豆包 response_format 回退链）。
 * bodyVariants 为空时等价于单次 `{}` 扩展。
 */
export async function postOpenAiChatCompletionsWithBodyVariants(
  config: OpenAiCompatibleLlmEnvConfig,
  request: OpenAiChatCompletionsRequest,
  options: PostOpenAiChatCompletionsOptions,
  bodyVariants: Record<string, unknown>[],
  fallback?: ChatCompletionsFallbackPolicy
): Promise<string> {
  const variants = bodyVariants.length > 0 ? bodyVariants : [{}];
  let lastError: Error | null = null;

  for (let i = 0; i < variants.length; i += 1) {
    try {
      return await postOpenAiChatCompletionsOnce(
        config,
        request,
        options,
        variants[i]!,
        i + 1
      );
    } catch (e) {
      if (!(e instanceof OpenAiChatCompletionsError)) throw e;
      lastError = e;
      const status = e.status ?? 0;
      const canFallback =
        fallback?.shouldFallback(status, e.message, i, variants.length) ?? false;
      if (!canFallback || i >= variants.length - 1) throw e;
    }
  }

  throw lastError ?? new OpenAiChatCompletionsError(`${options.vendorLabel} API 调用失败`);
}
