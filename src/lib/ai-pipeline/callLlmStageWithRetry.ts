import {
  AI_PIPELINE_LLM_MAX_RETRIES,
  AI_PIPELINE_LLM_MAX_TRANSIENT_RETRIES,
} from "../../layout-variant-ai-contract/constants";
import { AiPipelineError } from "../../layout-variant-ai-contract/errors";
import type { PipelineStepProgress } from "./ports/PipelineProgressReporter";
import { StepTimeoutError, withStepTimeout } from "./withStepTimeout";
import { llmExchangeContextStore } from "./llmCallContext";
import { isLlmStageFailure, LlmStageFailure, type LlmRetryFeedback } from "./llmRetryFeedback";
import {
  computeTransientBackoffMs,
  formatLlmFailureMessage,
  isTransientLlmError,
  sleepMs,
} from "./llmTransientRetry";

export type LlmStageCallOptions = {
  stage: string;
  sectionId?: string;
  maxRetries?: number;
  /** 429 / 5xx / 网络瞬态错误的退避重试（默认 AI_PIPELINE_LLM_MAX_TRANSIENT_RETRIES） */
  maxTransientRetries?: number;
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
  const maxTransientRetries =
    opts.maxTransientRetries ?? AI_PIPELINE_LLM_MAX_TRANSIENT_RETRIES;
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

    for (let transient = 0; ; transient += 1) {
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
        if (isTransientLlmError(e) && transient < maxTransientRetries) {
          const waitMs = computeTransientBackoffMs(transient);
          const waitSec = Math.ceil(waitMs / 1000);
          step?.failAttempt(attemptNum, {
            detail: `豆包限流或瞬态错误，${waitSec}s 后重试（${transient + 1}/${maxTransientRetries}）`,
            maxAttempts: maxRetries + 1,
          });
          await sleepMs(waitMs);
          step?.retry(attemptNum, {
            detail: `瞬态重试 ${transient + 2}/${maxTransientRetries + 1}`,
            maxAttempts: maxRetries + 1,
          });
          continue;
        }
        break;
      }
    }

    if (attempt < maxRetries && isLlmStageFailure(lastError)) {
      retryFeedback = lastError.feedback;
      step?.failAttempt(attemptNum, {
        detail: `第 ${attemptNum} 次未通过，即将重试`,
        maxAttempts: maxRetries + 1,
      });
      continue;
    }
    step?.fail();
    break;
  }
  if (lastError instanceof AiPipelineError) throw lastError;
  if (lastError instanceof LlmStageFailure) {
    throw new AiPipelineError("VALIDATION_FAILED", lastError.message);
  }
  const message =
    lastError instanceof StepTimeoutError
      ? lastError.message
      : formatLlmFailureMessage(lastError);
  throw new AiPipelineError("LLM_PARSE_FAILED", message);
}
