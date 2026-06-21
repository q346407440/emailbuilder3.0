import {
  AI_PIPELINE_LLM_TRANSIENT_BACKOFF_BASE_MS,
} from "../../layout-variant-ai-contract/constants";
import { isTransientLlmError } from "./llmTransientError";

const TRANSIENT_BACKOFF_MAX_MS = 30_000;

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 瞬态重试退避：3s → 6s → 12s → 24s（封顶 30s）。 */
export function computeTransientBackoffMs(transientAttempt: number): number {
  const exp = AI_PIPELINE_LLM_TRANSIENT_BACKOFF_BASE_MS * 2 ** transientAttempt;
  return Math.min(exp, TRANSIENT_BACKOFF_MAX_MS);
}

export function formatLlmFailureMessage(e: unknown): string {
  if (!(e instanceof Error)) {
    return typeof e === "string" ? e : "LLM 调用失败";
  }
  const status = (e as Error & { status?: number }).status;
  if (status === 429 || e.message.includes("429")) {
    return (
      "豆包 API 请求过于频繁（限流 RequestBurstTooFast）。" +
      "请等待 30～60 秒后再次点击生成，并避免短时间内连续多次以图创建。"
    );
  }
  return e.message;
}

export { isTransientLlmError };
