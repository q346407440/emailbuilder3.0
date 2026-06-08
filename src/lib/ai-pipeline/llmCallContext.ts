import { AsyncLocalStorage } from "node:async_hooks";
import type { PipelineStepProgress } from "./ports/PipelineProgressReporter";

/** 单次 LLM 交换日志附带的管线上下文（AsyncLocalStorage 传递，避免改各 stage 签名）。 */
export type LlmExchangeContext = {
  pipelineRunId?: string;
  emailKey?: string;
  layoutVariantId?: string;
  stage?: string;
  sectionId?: string;
  /** callLlmStageWithRetry 的重试序号（从 1 起） */
  attempt?: number;
  /** 队列真正开始执行 LLM 请求时再推进 step 进度（排队期间保持 pending） */
  stepProgress?: PipelineStepProgress;
};

export const llmExchangeContextStore = new AsyncLocalStorage<LlmExchangeContext>();

export function getLlmExchangeContext(): LlmExchangeContext {
  return llmExchangeContextStore.getStore() ?? {};
}
