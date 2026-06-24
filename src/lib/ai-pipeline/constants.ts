import { join } from "node:path";
import { IMAGE_PLACEHOLDER_PUBLIC_PATH } from "../imagePlaceholder";

/** B4 / RestoreAst 无结果时的占位图（本地静态 PNG）。 */
export const AI_PIPELINE_PLACEHOLDER_IMAGE_URL = IMAGE_PLACEHOLDER_PUBLIC_PATH;

/** Pexels 搜图目标宽度默认值（版心宽）。 */
export const PEXELS_SEARCH_TARGET_WIDTH = 600;

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
