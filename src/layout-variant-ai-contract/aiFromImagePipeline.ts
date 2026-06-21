/** 以图创建版式：AI 管线模式（选项 1 暂留 / 选项 2 现行）。 */
export type LayoutVariantAiFromImagePipeline = "mjs-patch" | "restore-ast";

export const LAYOUT_VARIANT_AI_FROM_IMAGE_PIPELINES = [
  "mjs-patch",
  "restore-ast",
] as const satisfies readonly LayoutVariantAiFromImagePipeline[];

/** 方案 1（patch）暂留：实现已移除，UI 保留供未来试验其它方案。 */
export const MJS_PATCH_PIPELINE_RESERVED_MESSAGE =
  "方案 1（patch）暂未开放，请使用方案 2 · RestoreAst";

export function isMjsPatchPipelineReserved(
  pipeline: LayoutVariantAiFromImagePipeline
): boolean {
  return pipeline === "mjs-patch";
}

export function parseLayoutVariantAiFromImagePipeline(
  raw: string | undefined | null
): LayoutVariantAiFromImagePipeline {
  const normalized = raw?.trim();
  if (normalized === "mjs-patch") return "mjs-patch";
  return "restore-ast";
}
