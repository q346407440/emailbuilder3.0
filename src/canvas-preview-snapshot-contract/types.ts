import type { RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";

/** 画布 committed snapshot 阶段（编辑器壳层，不影响块渲染语义） */
export type CanvasSnapshotPhase = "idle" | "loading" | "prewarming" | "ready";

export type CanvasPreviewIssue = { path: string; reason: string };

/**
 * 画布预览 committed snapshot：画布渲染与 live 交互消费者的同步真源。
 * `generation` 对齐当次 `loadEmail` 的 `requestId`；编辑不递增。
 */
export type CanvasPreviewSnapshot = {
  generation: number;
  previewModel: RepeatPreviewModel;
  flatTemplate: EmailTemplate;
  /** `previewModelToFlatTemplate` 所用的 visibility 后模板 */
  sourceTemplate: EmailTemplate;
  issues: CanvasPreviewIssue[];
};
