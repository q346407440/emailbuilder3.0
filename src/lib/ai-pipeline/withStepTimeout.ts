import { AI_PIPELINE_STEP_TIMEOUT_MS } from "../../layout-variant-ai-contract/constants";

export class StepTimeoutError extends Error {
  constructor(label?: string) {
    super(
      label
        ? `${label} 执行超时（${AI_PIPELINE_STEP_TIMEOUT_MS / 1000} 秒）`
        : `步骤执行超时（${AI_PIPELINE_STEP_TIMEOUT_MS / 1000} 秒）`
    );
    this.name = "StepTimeoutError";
  }
}

/** 单步超时：超时视为失败，由上层重试逻辑处理。 */
export async function withStepTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = AI_PIPELINE_STEP_TIMEOUT_MS,
  label?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new StepTimeoutError(label)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
