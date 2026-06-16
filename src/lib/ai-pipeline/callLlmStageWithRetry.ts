import { AI_PIPELINE_LLM_MAX_RETRIES } from "../../layout-variant-ai-contract/constants";
import { AiPipelineError } from "../../layout-variant-ai-contract/errors";
import type { PipelineStepProgress } from "./ports/PipelineProgressReporter";
import { StepTimeoutError, withStepTimeout } from "./withStepTimeout";
import { llmExchangeContextStore } from "./llmCallContext";
import { isLlmStageFailure, LlmStageFailure, type LlmRetryFeedback } from "./llmRetryFeedback";

export type LlmStageCallOptions = {
  stage: string;
  sectionId?: string;
  maxRetries?: number;
  stepProgress?: PipelineStepProgress;
  /** 单步外层超时（默认 AI_PIPELINE_STEP_TIMEOUT_MS） */
  timeoutMs?: number;
};

export type LlmStageAttemptContext = {
  /** 从 1 起 */
  attempt: number;
  /** 上一轮校验失败时的输出与错误（仅 attempt > 1 且上一轮为 LlmStageFailure 时有值） */
  feedback?: LlmRetryFeedback;
};

/** §6.2 单 stage 统一重试包装（含 60s 单步超时；校验失败时带 feedback 重试）。 */
export async function callLlmStageWithRetry<T>(
  opts: LlmStageCallOptions,
  fn: (ctx: LlmStageAttemptContext) => Promise<T>
): Promise<T> {
  const maxRetries = opts.maxRetries ?? AI_PIPELINE_LLM_MAX_RETRIES;
  const step = opts.stepProgress;
  const parentCtx = llmExchangeContextStore.getStore();
  let lastError: unknown;
  let retryFeedback: LlmRetryFeedback | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const attemptNum = attempt + 1;
    if (attempt > 0) {
      step?.retry(attemptNum, {
        detail: `第 ${attemptNum} 次重试`,
        maxAttempts: maxRetries + 1,
      });
    }
    try {
      const result = await llmExchangeContextStore.run(
        {
          ...(parentCtx ?? {}),
          stage: opts.stage,
          sectionId: opts.sectionId,
          attempt: attemptNum,
        },
        () =>
          withStepTimeout(
            fn({ attempt: attemptNum, feedback: retryFeedback }),
            opts.timeoutMs,
            opts.stage
          )
      );
      step?.succeed();
      return result;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        retryFeedback = isLlmStageFailure(e) ? e.feedback : undefined;
        step?.failAttempt(attemptNum, {
          detail: `第 ${attemptNum} 次未通过，即将重试`,
          maxAttempts: maxRetries + 1,
        });
        continue;
      }
      step?.fail();
    }
  }
  if (lastError instanceof AiPipelineError) throw lastError;
  if (lastError instanceof LlmStageFailure) {
    throw new AiPipelineError("VALIDATION_FAILED", lastError.message);
  }
  const message =
    lastError instanceof StepTimeoutError
      ? lastError.message
      : lastError instanceof Error
        ? lastError.message
        : `${opts.stage} LLM 调用失败`;
  throw new AiPipelineError("LLM_PARSE_FAILED", message);
}
