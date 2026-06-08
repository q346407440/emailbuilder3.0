import { join } from "node:path";

/** B4 无结果时的占位图（Pexels，与 fixture 一致）。 */
export const AI_PIPELINE_PLACEHOLDER_IMAGE_URL =
  "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=600";

/**
 * 本地测试：每次 LLM HTTP 交换的完整 request/response JSON（JSON Lines）。
 * 由 start.sh 在启动时清空；设 AI_PIPELINE_LLM_EXCHANGE_LOG=0 可关闭。
 */
export function resolveAiPipelineLlmExchangeLogPath(): string {
  return (
    (process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH ?? "").trim() ||
    join(process.cwd(), "logs/ai-pipeline-llm.jsonl")
  );
}

/** @deprecated 优先用 resolveAiPipelineLlmExchangeLogPath（测试可设 env 后再解析）。 */
export const AI_PIPELINE_LLM_EXCHANGE_LOG_PATH = resolveAiPipelineLlmExchangeLogPath();
