import { appendLlmExchangeLog } from "../llmExchangeFileLog";
import type { OpenAiCompatibleLlmEnvConfig } from "../llmVendorConfig";
import { chatCompletionsUrl, OpenAiChatCompletionsError } from "./openAiCompatibleChat";

export type LlmStreamChannel = "think" | "content";

export type LlmStreamDelta = {
  channel: LlmStreamChannel;
  text: string;
};

export class LlmStreamIdleTimeoutError extends Error {
  constructor(idleTimeoutMs: number) {
    super(`LLM 流式响应超过 ${Math.round(idleTimeoutMs / 1000)} 秒无新数据`);
    this.name = "TimeoutError";
  }
}

export type PostOpenAiChatCompletionsStreamOptions = {
  vendorLabel: string;
  idleTimeoutMs: number;
  absoluteTimeoutMs?: number;
  augmentBaseBody?: (base: Record<string, unknown>) => Record<string, unknown>;
  onDelta: (delta: LlmStreamDelta) => void;
};

/** 解析 OpenAI 兼容 SSE chunk 中的 reasoning / content delta。 */
export function parseOpenAiStreamChunk(json: string): LlmStreamDelta[] {
  if (json.trim() === "[DONE]") return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const delta = (data as { choices?: Array<{ delta?: Record<string, unknown> }> }).choices?.[0]
    ?.delta;
  if (!delta) return [];
  const out: LlmStreamDelta[] = [];
  const reasoning = delta.reasoning_content;
  if (typeof reasoning === "string" && reasoning.length > 0) {
    out.push({ channel: "think", text: reasoning });
  }
  const content = delta.content;
  if (typeof content === "string" && content.length > 0) {
    out.push({ channel: "content", text: content });
  }
  return out;
}

function createSlidingIdleAbort(
  idleTimeoutMs: number,
  absoluteTimeoutMs?: number
): { signal: AbortSignal; touch: () => void; dispose: () => void } {
  const controller = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const startedAt = Date.now();

  const touch = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (absoluteTimeoutMs != null && Date.now() - startedAt >= absoluteTimeoutMs) {
      controller.abort(new LlmStreamIdleTimeoutError(absoluteTimeoutMs));
      return;
    }
    idleTimer = setTimeout(() => {
      controller.abort(new LlmStreamIdleTimeoutError(idleTimeoutMs));
    }, idleTimeoutMs);
  };

  touch();
  return {
    signal: controller.signal,
    touch,
    dispose: () => {
      if (idleTimer) clearTimeout(idleTimer);
    },
  };
}

/** 流式 POST …/chat/completions；仅在 idle 窗口内无新 chunk 时超时。 */
export async function postOpenAiChatCompletionsStream(
  config: OpenAiCompatibleLlmEnvConfig,
  request: Record<string, unknown>,
  options: PostOpenAiChatCompletionsStreamOptions,
  bodyExtensions: Record<string, unknown> = {},
  httpAttempt = 1
): Promise<string> {
  const url = chatCompletionsUrl(config.baseUrl);
  const body = {
    ...request,
    ...(options.augmentBaseBody?.(request) ?? {}),
    ...bodyExtensions,
    stream: true,
  };

  appendLlmExchangeLog({
    type: "request",
    httpAttempt,
    url,
    body,
  });

  const idle = createSlidingIdleAbort(options.idleTimeoutMs, options.absoluteTimeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: idle.signal,
    });
  } catch (e) {
    idle.dispose();
    appendLlmExchangeLog({
      type: "error",
      httpAttempt,
      url,
      message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  if (!res.ok) {
    idle.dispose();
    const responseText = await res.text();
    let responseBody: unknown = responseText;
    try {
      responseBody = JSON.parse(responseText) as unknown;
    } catch {
      // 保留原文
    }
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

  const reader = res.body?.getReader();
  if (!reader) {
    idle.dispose();
    throw new OpenAiChatCompletionsError(`${options.vendorLabel} 流式响应无 body`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullThink = "";
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      idle.touch();
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        if (!event.trim()) continue;
        for (const line of event.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trimStart();
          if (!payload || payload === "[DONE]") continue;
          for (const delta of parseOpenAiStreamChunk(payload)) {
            if (delta.channel === "think") {
              fullThink += delta.text;
            } else {
              fullContent += delta.text;
            }
            options.onDelta(delta);
          }
        }
      }
    }
  } finally {
    idle.dispose();
    reader.releaseLock();
  }

  appendLlmExchangeLog({
    type: "response",
    httpAttempt,
    url,
    status: res.status,
    body: {
      stream: true,
      reasoning_content: fullThink || undefined,
      content: fullContent,
    },
  });

  if (!fullContent.trim()) {
    throw new OpenAiChatCompletionsError(`${options.vendorLabel} 流式返回空 content`);
  }
  return fullContent;
}
