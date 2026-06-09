/** 以图 AI 生成：前端步骤进度事件真源。 */

export type AiPipelineStepStatus =
  | "pending"
  | "running"
  /** @deprecated 旧管线「同一步骤上即将重试」；新管线用 failed + append 新行 */
  | "failed_once"
  | "success"
  | "failed";

export type AiPipelineUiStep = {
  id: string;
  label: string;
};

/** 豆包 mjs 管线：首次生成 + 最多 2 次重试。 */
export const MANUAL_RESTORE_MJS_MAX_ATTEMPTS = 3;

/** 以图 AI 创建（豆包 mjs 管线）前端步骤。 */
export const MANUAL_RESTORE_MJS_UI_STEPS_INITIAL: readonly AiPipelineUiStep[] = [
  { id: "MR:VisualBlueprint", label: "识别视觉规格" },
  { id: "MR:ResolveAssets", label: "搜索远程素材（Pexels/CDN）" },
  { id: "MR:MjsGenerate", label: "豆包生成还原脚本" },
  { id: "MR:RunValidate", label: "执行脚本并校验" },
  { id: "MR:VisualLint", label: "检查视觉质量门" },
  { id: "MR:Persist", label: "落盘新版式" },
] as const;

export function buildPendingManualRestoreSteps(): AiStepUiState[] {
  return MANUAL_RESTORE_MJS_UI_STEPS_INITIAL.map((step) => ({
    ...step,
    status: "pending" as const,
  }));
}

/** 提交后立即展示的固定步骤（旧 A→E 管线；HTTP 以图创建已改用 MANUAL_RESTORE_MJS_UI_STEPS_INITIAL）。 */
export const AI_PIPELINE_UI_STEPS_INITIAL: readonly AiPipelineUiStep[] = [
  { id: "A", label: "识别布局分区" },
  { id: "B1", label: "提取样式档位" },
  { id: "B2", label: "识别图标" },
  { id: "B3", label: "提取文案" },
  { id: "B4", label: "匹配图片资产" },
  { id: "C:_pending", label: "生成区域结构（识别分区后展开）" },
  { id: "E", label: "合成与校验" },
] as const;

export type AiPipelineStepEventFields = {
  attempt?: number;
  /** 供 Reporter 拼入主行 label，不再单独渲染副行 */
  detail?: string;
  maxAttempts?: number;
};

export type AiPipelineProgressPayload =
  | { type: "plan"; steps: AiPipelineUiStep[]; /** 默认 pending：旧管线预展示；hidden：仅登记元数据，逐步 append */ display?: "pending" | "hidden" }
  | ({
      type: "step";
      stepId: string;
      status: AiPipelineStepStatus;
      /** 行唯一 id；默认同 stepId，重试 append 时为 stepId~2 等 */
      entryId?: string;
      /** true 时在逻辑步骤最后一行之后插入新行，不覆盖失败行 */
      append?: boolean;
      /** 覆盖整行文案（含 detail 时由 Reporter 拼好） */
      label?: string;
    } & AiPipelineStepEventFields)
  | ({
      type: "stepDetail";
      stepId: string;
    } & AiPipelineStepEventFields);

export type AiStepUiState = AiPipelineUiStep & {
  status: AiPipelineStepStatus;
  attempt?: number;
  maxAttempts?: number;
};

/** 与终端日志一致的「尝试 N/M」后缀。 */
export function formatManualRestoreAttemptLabel(
  attempt: number,
  maxAttempts: number = MANUAL_RESTORE_MJS_MAX_ATTEMPTS
): string {
  return `尝试 ${attempt}/${maxAttempts}`;
}

/** 逻辑 stepId 在列表中最后一行的下标（含 stepId~N 重试行）。 */
export function findLastEntryIndexForStep(
  steps: readonly AiStepUiState[],
  stepId: string
): number {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const id = steps[i]!.id;
    if (id === stepId || id.startsWith(`${stepId}~`)) return i;
  }
  return -1;
}

function resolveEntryIndex(
  steps: readonly AiStepUiState[],
  stepId: string,
  entryId?: string
): number {
  if (entryId) {
    const byEntry = steps.findIndex((s) => s.id === entryId);
    if (byEntry >= 0) return byEntry;
  }
  return steps.findIndex((s) => s.id === stepId);
}

function mergeStepFields(
  step: AiStepUiState,
  fields: AiPipelineStepEventFields
): AiStepUiState {
  return {
    ...step,
    ...(fields.attempt !== undefined ? { attempt: fields.attempt } : {}),
    ...(fields.maxAttempts !== undefined ? { maxAttempts: fields.maxAttempts } : {}),
  };
}

function appendStepRow(
  prev: AiStepUiState[],
  event: Extract<AiPipelineProgressPayload, { type: "step" }>,
  insertAt: number,
  baseLabel: string
): AiStepUiState[] {
  const newRow: AiStepUiState = {
    id: event.entryId ?? `${event.stepId}~${insertAt}`,
    label: event.label ?? baseLabel,
    status: event.status,
    ...(event.attempt !== undefined ? { attempt: event.attempt } : {}),
    ...(event.maxAttempts !== undefined ? { maxAttempts: event.maxAttempts } : {}),
  };
  return [...prev.slice(0, insertAt), newRow, ...prev.slice(insertAt)];
}

export function reduceAiPipelineProgress(
  prev: AiStepUiState[] | null,
  event: AiPipelineProgressPayload
): AiStepUiState[] {
  if (event.type === "plan") {
    if (event.display === "hidden") {
      return prev ?? [];
    }
    const prevMap = new Map((prev ?? []).map((s) => [s.id, s]));
    return event.steps.map((step) => {
      const existing = prevMap.get(step.id);
      if (existing) {
        return {
          ...step,
          status: existing.status,
          attempt: existing.attempt,
          maxAttempts: existing.maxAttempts,
        };
      }
      return { ...step, status: "pending" as const };
    });
  }
  const base = prev ?? [];
  if (event.type === "stepDetail") {
    const idx = resolveEntryIndex(base, event.stepId);
    if (idx < 0) return base;
    const row = base[idx]!;
    const detailSuffix = event.detail ? ` — ${event.detail}` : "";
    const baseLabel = row.label.split(" — ")[0] ?? row.label;
    return base.map((step, i) =>
      i === idx
        ? mergeStepFields({ ...step, label: `${baseLabel}${detailSuffix}` }, event)
        : step
    );
  }
  if (event.type === "step" && event.append) {
    const lastSameStep = findLastEntryIndexForStep(base, event.stepId);
    const baseLabel =
      event.label?.split(" — ")[0] ??
      (lastSameStep >= 0 ? base[lastSameStep]!.label.split(" — ")[0] : event.stepId);
    // 全局时序 append：始终接在列表末尾，避免重试行插到同 stepId 旧行之后、已 append 的其它步骤之前
    return appendStepRow(base, event, base.length, baseLabel);
  }
  const idx = resolveEntryIndex(base, event.stepId, event.entryId);
  if (idx < 0 && event.type === "step") {
    const baseLabel = event.label?.split(" — ")[0] ?? event.stepId;
    return appendStepRow(base, event, base.length, baseLabel);
  }
  if (idx < 0) return base;
  return base.map((step, i) => {
    if (i !== idx) return step;
    const merged = mergeStepFields(step, event);
    return {
      ...merged,
      ...(event.label !== undefined ? { label: event.label } : {}),
      status: event.status,
    };
  });
}

export function buildSectionPlanSteps(
  sections: ReadonlyArray<{ sectionId: string; name: string }>
): AiPipelineUiStep[] {
  // 去掉占位 C 与尾部 E：C 按区域展开，E 在末尾只保留一次
  const head = AI_PIPELINE_UI_STEPS_INITIAL.filter(
    (s) => !s.id.startsWith("C:") && s.id !== "E"
  );
  const cSteps = sections.map((s) => ({
    id: `C:${s.sectionId}`,
    label: `生成区域：${s.name}`,
  }));
  return [...head, ...cSteps, { id: "E", label: "合成与校验" }];
}
