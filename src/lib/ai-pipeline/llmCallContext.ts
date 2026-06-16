import { AsyncLocalStorage } from "node:async_hooks";

/** 单次 LLM 交换日志附带的管线上下文（AsyncLocalStorage 传递，避免改各 stage 签名）。 */
export type LlmExchangeContext = {
  pipelineRunId?: string;
  emailKey?: string;
  layoutVariantId?: string;
  stage?: string;
  sectionId?: string;
  /** callLlmStageWithRetry 的重试序号（从 1 起） */
  attempt?: number;
};

export const llmExchangeContextStore = new AsyncLocalStorage<LlmExchangeContext>();

export function getLlmExchangeContext(): LlmExchangeContext {
  return llmExchangeContextStore.getStore() ?? {};
}
