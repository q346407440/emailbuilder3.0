import type {
  AiPipelineProgressPayload,
  AiPipelineStepEventFields,
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

type StepMeta = {
  baseLabel: string;
  activeEntryId: string;
  seq: number;
};

function labelWithDetail(baseLabel: string, detail?: string): string | undefined {
  if (!detail?.trim()) return undefined;
  return `${baseLabel} — ${detail}`;
}

function buildEntryId(stepId: string, seq: number): string {
  return seq === 1 ? stepId : `${stepId}~${seq}`;
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

export function createPipelineProgressReporter(
  emit: (payload: AiPipelineProgressPayload) => void
): PipelineProgressReporter {
  const stepMeta = new Map<string, StepMeta>();

  function ensureMeta(stepId: string): StepMeta {
    const existing = stepMeta.get(stepId);
    if (existing) return existing;
    const created: StepMeta = { baseLabel: stepId, activeEntryId: stepId, seq: 1 };
    stepMeta.set(stepId, created);
    return created;
  }

  function appendEntry(
    stepId: string,
    status: "running" | "failed" | "success" | "pending",
    attempt: number | undefined,
    opts?: PipelineStepProgressOpts
  ) {
    const meta = ensureMeta(stepId);
    meta.seq += 1;
    meta.activeEntryId = buildEntryId(stepId, meta.seq);
    stepMeta.set(stepId, meta);
    emit({
      type: "step",
      stepId,
      entryId: meta.activeEntryId,
      append: true,
      status,
      attempt,
      label: labelWithDetail(meta.baseLabel, opts?.detail) ?? meta.baseLabel,
      maxAttempts: opts?.maxAttempts,
    });
  }

  return {
    emitPlan(steps, opts) {
      for (const step of steps) {
        stepMeta.set(step.id, {
          baseLabel: step.label,
          activeEntryId: step.id,
          seq: 1,
        });
      }
      emit({ type: "plan", steps: [...steps], display: opts?.display ?? "pending" });
    },
    forStep(stepId) {
      return {
        start(attempt = 1, opts) {
          if (attempt > 1) {
            appendEntry(stepId, "running", attempt, opts);
            return;
          }
          const meta = ensureMeta(stepId);
          emit({
            type: "step",
            stepId,
            entryId: meta.activeEntryId,
            status: "running",
            attempt,
            label: labelWithDetail(meta.baseLabel, opts?.detail),
            maxAttempts: opts?.maxAttempts,
          });
        },
        failAttempt(attempt, opts) {
          const meta = ensureMeta(stepId);
          emit({
            type: "step",
            stepId,
            entryId: meta.activeEntryId,
            status: "failed",
            attempt,
            label: labelWithDetail(meta.baseLabel, opts?.detail),
            maxAttempts: opts?.maxAttempts,
          });
        },
        retry(attempt, opts) {
          appendEntry(stepId, "running", attempt, opts);
        },
        logDetail(detail, opts) {
          const meta = ensureMeta(stepId);
          emit({
            type: "step",
            stepId,
            entryId: meta.activeEntryId,
            status: "running",
            label: labelWithDetail(meta.baseLabel, detail),
            attempt: opts?.attempt,
            maxAttempts: opts?.maxAttempts,
          });
        },
        succeed() {
          const meta = ensureMeta(stepId);
          emit({
            type: "step",
            stepId,
            entryId: meta.activeEntryId,
            status: "success",
          });
        },
        fail(opts) {
          const meta = ensureMeta(stepId);
          emit({
            type: "step",
            stepId,
            entryId: meta.activeEntryId,
            status: "failed",
            label: labelWithDetail(meta.baseLabel, opts?.detail),
            maxAttempts: opts?.maxAttempts,
          });
        },
      };
    },
  };
}
