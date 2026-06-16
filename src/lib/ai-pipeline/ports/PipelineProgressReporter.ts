import type {
  AiPipelineProgressPayload,
  AiPipelineStepEventFields,
  AiPipelineStepStatus,
  AiPipelineUiStep,
} from "../../../layout-variant-ai-contract/progress";

export type PipelineStepProgressOpts = AiPipelineStepEventFields;

export type PipelineStepProgress = {
  start(attempt?: number, opts?: PipelineStepProgressOpts): void;
  failAttempt(attempt: number, opts?: PipelineStepProgressOpts): void;
  retry(attempt: number, opts?: PipelineStepProgressOpts): void;
  /** 运行中更新主行文案（不追加副行） */
  logDetail(detail: string, opts?: PipelineStepProgressOpts): void;
  succeed(): void;
  fail(opts?: PipelineStepProgressOpts): void;
};

export type PipelineProgressReporter = {
  emitPlan(steps: AiPipelineUiStep[], opts?: { display?: "pending" | "hidden" }): void;
  forStep(stepId: string): PipelineStepProgress;
};

function labelWithDetail(baseLabel: string, detail?: string): string | undefined {
  if (!detail?.trim()) return undefined;
  return `${baseLabel} — ${detail}`;
}

export function createNoopPipelineProgressReporter(): PipelineProgressReporter {
  const noop = () => {};
  const step: PipelineStepProgress = {
    start: noop,
    failAttempt: noop,
    retry: noop,
    logDetail: noop,
    succeed: noop,
    fail: noop,
  };
  return {
    emitPlan: noop,
    forStep: () => step,
  };
}

/**
 * 一步一行 Reporter：同一 stepId 的全部事件都落在同一行上（状态原地变更），
 * 不为重试追加新行；行的新增由 reducer 对未知 stepId 兜底。
 */
export function createPipelineProgressReporter(
  emit: (payload: AiPipelineProgressPayload) => void
): PipelineProgressReporter {
  const baseLabels = new Map<string, string>();

  function baseLabelOf(stepId: string): string {
    return baseLabels.get(stepId) ?? stepId;
  }

  function emitStep(
    stepId: string,
    status: AiPipelineStepStatus,
    attempt?: number,
    opts?: PipelineStepProgressOpts
  ): void {
    emit({
      type: "step",
      stepId,
      status,
      // detail 缺省时回落基础文案，避免行内残留上一状态的细节文案
      label: labelWithDetail(baseLabelOf(stepId), opts?.detail) ?? baseLabelOf(stepId),
      ...(attempt !== undefined ? { attempt } : {}),
      ...(opts?.maxAttempts !== undefined ? { maxAttempts: opts.maxAttempts } : {}),
    });
  }

  return {
    emitPlan(steps, opts) {
      for (const step of steps) {
        baseLabels.set(step.id, step.label);
      }
      emit({ type: "plan", steps: [...steps], display: opts?.display ?? "pending" });
    },
    forStep(stepId) {
      return {
        start(attempt = 1, opts) {
          emitStep(stepId, "running", attempt, opts);
        },
        failAttempt(attempt, opts) {
          emitStep(stepId, "failed", attempt, opts);
        },
        retry(attempt, opts) {
          emitStep(stepId, "running", attempt, opts);
        },
        logDetail(detail, opts) {
          emitStep(stepId, "running", opts?.attempt, { ...opts, detail });
        },
        succeed() {
          // 成功保留行内最后的文案（如「第 2 次重试」），仅翻转状态
          emit({ type: "step", stepId, status: "success" });
        },
        fail(opts) {
          emitStep(stepId, "failed", opts?.attempt, opts);
        },
      };
    },
  };
}
