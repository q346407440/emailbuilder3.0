/**
 * 以图 AI 生成：前端步骤进度事件真源。
 *
 * 展示原则（一步一行）：后端每个步骤对应前端一行；步骤的重试、失败、成功都是
 * **同一行的状态原地变更**；只有后端出现前端未知的新步骤时才新增一行。
 */

export type AiPipelineStepStatus = "pending" | "running" | "success" | "failed";

export type AiPipelineUiStep = {
  id: string;
  label: string;
};

/** 豆包 mjs 管线：首次生成 + 最多 2 次重试。 */
export const MANUAL_RESTORE_MJS_MAX_ATTEMPTS = 3;

/** 豆包 mjs 管线前端步骤（方案 1 暂留；实现下线后仅保留步骤定义供未来复用）。 */
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

/** 以图 AI 创建（RestoreAst 三步骤管线）前端步骤；失败不重试。 */
export const RESTORE_AST_UI_STEPS_INITIAL: readonly AiPipelineUiStep[] = [
  { id: "RA:GenerateAst", label: "生成语义结构（RestoreAst）" },
  { id: "RA:ResolveAssets", label: "搜索图片与图标" },
  { id: "RA:Assemble", label: "组装版式与校验" },
] as const;

export function buildPendingRestoreAstSteps(): AiStepUiState[] {
  return RESTORE_AST_UI_STEPS_INITIAL.map((step) => ({
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
  | { type: "plan"; steps: AiPipelineUiStep[]; /** 默认 pending：预展示全部步骤；hidden：仅登记元数据，步骤首个事件到达时再逐行出现 */ display?: "pending" | "hidden" }
  | ({
      type: "step";
      stepId: string;
      status: AiPipelineStepStatus;
      /** 覆盖整行文案（含 detail 时由 Reporter 拼好）；缺省保留行内已有文案 */
      label?: string;
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
  const idx = base.findIndex((s) => s.id === event.stepId);
  if (idx < 0) {
    // 前端未知的后端步骤（hidden plan 渐进出现 / 后端新增步骤）→ 末尾新增一行
    return [
      ...base,
      {
        id: event.stepId,
        label: event.label ?? event.stepId,
        status: event.status,
        ...(event.attempt !== undefined ? { attempt: event.attempt } : {}),
        ...(event.maxAttempts !== undefined ? { maxAttempts: event.maxAttempts } : {}),
      },
    ];
  }
  // 已知步骤：状态与文案原地变更（重试也在同一行展示）
  return base.map((step, i) => {
    if (i !== idx) return step;
    return {
      ...step,
      status: event.status,
      ...(event.label !== undefined ? { label: event.label } : {}),
      ...(event.attempt !== undefined ? { attempt: event.attempt } : {}),
      ...(event.maxAttempts !== undefined ? { maxAttempts: event.maxAttempts } : {}),
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
