/**
 * 瞬态 LLM 传输错误判定：此类错误应消耗一次 attempt 后继续重试（或保底交付），
 * 而非让整个管线悬崖式失败（2026-06-12 模板 38 实证：patch 调用 180s 超时直接终止 run）。
 */
import { OpenAiChatCompletionsError } from "./adapters/openAiCompatibleChat";
import { GeminiApiError } from "./adapters/geminiClient";

export function isTransientLlmError(e: unknown): boolean {
  if (e instanceof OpenAiChatCompletionsError || e instanceof GeminiApiError) {
    const status = e.status;
    if (typeof status === "number" && (status === 429 || status >= 500)) {
      return true;
    }
  }
  if (e == null || typeof e !== "object") return false;
  const err = e as Partial<Error> & { status?: number };

  // AbortSignal.timeout → DOMException("TimeoutError")；手动 abort → "AbortError"；
  // withStepTimeout → StepTimeoutError（name 同名）
  if (err.name === "TimeoutError" || err.name === "AbortError" || err.name === "StepTimeoutError") {
    return true;
  }
  // OpenAI 兼容 HTTP 层在 Error 上附带 status（如 OpenAiChatCompletionsError）
  if (typeof err.status === "number" && (err.status === 429 || err.status >= 500)) {
    return true;
  }
  // Node fetch 网络层失败统一表现为 TypeError("fetch failed")
  if (err.name === "TypeError" && typeof err.message === "string" && err.message.includes("fetch failed")) {
    return true;
  }
  return false;
}
