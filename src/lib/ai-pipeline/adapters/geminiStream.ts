import { appendLlmExchangeLog } from "../llmExchangeFileLog";
import type { LlmStreamDelta } from "./openAiCompatibleChatStream";
import { LlmStreamIdleTimeoutError } from "./openAiCompatibleChatStream";

type GeminiStreamPart = { text?: string; thought?: boolean };

/** 从单条 GenerateContentResponse chunk 提取 think / content delta。 */
export function parseGeminiStreamChunk(json: string): LlmStreamDelta[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const parts = (
    data as { candidates?: Array<{ content?: { parts?: GeminiStreamPart[] } }> }
  ).candidates?.[0]?.content?.parts;
  if (!parts?.length) return [];
  const out: LlmStreamDelta[] = [];
  for (const part of parts) {
    if (typeof part.text !== "string" || part.text.length === 0) continue;
    out.push({
      channel: part.thought === true ? "think" : "content",
      text: part.text,
    });
  }
  return out;
}

/** 解析 SSE `data:` 行或 NDJSON 行（无 alt=sse 时的兼容）。 */
export function extractGeminiStreamPayloads(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("event:") || trimmed === "[DONE]") return [];
  if (trimmed.startsWith("data:")) {
    const payload = trimmed.slice(5).trimStart();
    return payload ? [payload] : [];
  }
  if (trimmed.startsWith("{")) return [trimmed];
  return [];
}

function applyGeminiStreamDeltas(
  payloads: string[],
  onDelta: (delta: LlmStreamDelta) => void,
  accum: { fullThink: string; fullContent: string }
): void {
  for (const payload of payloads) {
    for (const delta of parseGeminiStreamChunk(payload)) {
      if (delta.channel === "think") {
        accum.fullThink += delta.text;
      } else {
        accum.fullContent += delta.text;
      }
      onDelta(delta);
    }
  }
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

export type PostGeminiStreamOptions = {
  vendorLabel: string;
  idleTimeoutMs: number;
  absoluteTimeoutMs?: number;
  onDelta: (delta: LlmStreamDelta) => void;
};

export async function postGeminiStreamGenerateContent(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  options: PostGeminiStreamOptions,
  httpAttempt = 1
): Promise<string> {
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
        "x-goog-api-key": apiKey,
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
    appendLlmExchangeLog({
      type: "error",
      httpAttempt,
      url,
      status: res.status,
      message: `${options.vendorLabel} API ${res.status}`,
      body: responseText,
    });
    throw new Error(`${options.vendorLabel} API ${res.status}: ${responseText.slice(0, 400)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    idle.dispose();
    throw new Error(`${options.vendorLabel} 流式响应无 body`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const accum = { fullThink: "", fullContent: "" };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      idle.touch();
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        applyGeminiStreamDeltas(extractGeminiStreamPayloads(line), options.onDelta, accum);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      applyGeminiStreamDeltas(extractGeminiStreamPayloads(buffer), options.onDelta, accum);
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
      reasoning_content: accum.fullThink || undefined,
      content: accum.fullContent,
    },
  });

  if (!accum.fullContent.trim()) {
    throw new Error(`${options.vendorLabel} 流式返回空 content`);
  }
  return accum.fullContent;
}
