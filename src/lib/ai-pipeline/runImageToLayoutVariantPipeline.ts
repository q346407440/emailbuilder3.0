import { randomUUID } from "node:crypto";
import {
  AI_PIPELINE_UI_STEPS_INITIAL,
  buildSectionPlanSteps,
} from "../../layout-variant-ai-contract/progress";
import { AiPipelineError } from "../../layout-variant-ai-contract/errors";
import { createDefaultAssetResolver } from "./assetResolve";
import { createDoubaoClient } from "./adapters/doubaoClient";
import { wrapLlmClientWithQueue } from "./llmRequestQueue";
import { mergeSections } from "./mergeSections";
import { bindThemeRefsAfterAiLowering } from "./bindThemeRefsAfterAiLowering";
import { mapPipelineResultToEasyEmail } from "./mapPipelineResultToEasyEmail";
import { validatePipelineOutput } from "./validatePipelineOutput";
import { mergeAssetManifest, resolveIconsFromQueries } from "./assetManifest";
import { createConsolePipelineLogger } from "./ports/PipelineLogger";
import { llmExchangeContextStore } from "./llmCallContext";
import {
  createNoopPipelineProgressReporter,
  type PipelineProgressReporter,
} from "./ports/PipelineProgressReporter";
import { runStageA } from "./stages/stageA";
import { runStageB1 } from "./stages/stageB1";
import { runStageB2 } from "./stages/stageB2";
import { runStageB3 } from "./stages/stageB3";
import { runStageB4 } from "./stages/stageB4";
import { refineGroundingGridColumns } from "./refineGroundingGridColumns";
import { runStageCForSection } from "./stages/stageC";
import type { GroundingSection, MapPipelineOutput, PipelinePorts, PipelineRunContext, PipelineRunInput, PipelineRunResult } from "./types";

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const normalized = mimeType.trim() || "image/png";
  return `data:${normalized};base64,${buffer.toString("base64")}`;
}

export type RunPipelineOptions = Partial<PipelinePorts>;

function sectionStepId(section: GroundingSection): string {
  return `C:${section.sectionId}`;
}

/** A→B→C→D→E 主编排器（薄层：顺序 + 并行 + 失败策略）。 */
export async function runImageToLayoutVariantPipeline(
  input: PipelineRunInput,
  options: RunPipelineOptions = {}
): Promise<PipelineRunResult> {
  const pipelineRunId = randomUUID();
  const innerLlm = options.llm ?? createDoubaoClient();
  const llm = options.llm ? innerLlm : wrapLlmClientWithQueue(innerLlm);
  const assets = options.assets ?? createDefaultAssetResolver();
  const logger = options.logger ?? createConsolePipelineLogger();
  const progress: PipelineProgressReporter =
    options.progress ?? createNoopPipelineProgressReporter();

  const ctx = {
    ...input,
    pipelineRunId,
    imageDataUrl: bufferToDataUrl(input.imageBuffer, input.mimeType),
  };

  return llmExchangeContextStore.run(
    {
      pipelineRunId,
      emailKey: input.emailKey,
      layoutVariantId: input.layoutVariantId,
    },
    () => runImageToLayoutVariantPipelineBody(ctx, input, pipelineRunId, llm, assets, logger, progress)
  );
}

async function runImageToLayoutVariantPipelineBody(
  ctx: PipelineRunContext,
  input: PipelineRunInput,
  pipelineRunId: string,
  llm: NonNullable<PipelinePorts["llm"]>,
  assets: NonNullable<PipelinePorts["assets"]>,
  logger: NonNullable<PipelinePorts["logger"]>,
  progress: PipelineProgressReporter
): Promise<PipelineRunResult> {
  const startedAt = new Date().toISOString();
  logger.logStageEvent({
    pipelineRunId,
    stage: "START",
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
    startedAt,
  });

  progress.emitPlan([...AI_PIPELINE_UI_STEPS_INITIAL]);

  const tA = Date.now();
  const grounding = await runStageA(ctx, llm, progress.forStep("A"));
  progress.emitPlan(buildSectionPlanSteps(grounding.sections));
  logger.logStageEvent({
    pipelineRunId,
    stage: "A",
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
    startedAt,
    durationMs: Date.now() - tA,
  });

  const tB = Date.now();
  const stepB4 = progress.forStep("B4");
  stepB4.start();
  const [b1, iconQueries, textExtract, b4] = await Promise.all([
    runStageB1(ctx, llm, grounding, progress.forStep("B1")),
    runStageB2(ctx, llm, grounding, progress.forStep("B2")),
    runStageB3(ctx, llm, grounding, progress.forStep("B3")),
    runStageB4(grounding, assets).then((result) => {
      stepB4.succeed();
      return result;
    }),
  ]).catch((e) => {
    stepB4.fail();
    throw e;
  });
  const icons = await resolveIconsFromQueries(iconQueries, assets);
  const assetManifest = mergeAssetManifest(b4.images, icons);

  const { grounding: groundingForC, adjustedSectionIds } = refineGroundingGridColumns(
    grounding,
    iconQueries,
    textExtract
  );
  if (adjustedSectionIds.length > 0) {
    logger.logStageEvent({
      pipelineRunId,
      stage: "B",
      emailKey: input.emailKey,
      layoutVariantId: input.layoutVariantId,
      message: "gridColumns 后验抬高",
      detail: { adjustedSectionIds },
    });
  }

  logger.logStageEvent({
    pipelineRunId,
    stage: "B",
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
    startedAt,
    durationMs: Date.now() - tB,
  });

  const tC = Date.now();
  const sectionResults = await Promise.all(
    groundingForC.sections.map((section) =>
      runStageCForSection(
        ctx,
        llm,
        section,
        b1.tokens,
        textExtract,
        assetManifest,
        iconQueries,
        progress.forStep(sectionStepId(section))
      )
    )
  );
  const sections = sectionResults.filter((s): s is NonNullable<typeof s> => s != null);
  logger.logStageEvent({
    pipelineRunId,
    stage: "C",
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
    startedAt,
    durationMs: Date.now() - tC,
  });

  if (sections.length === 0) {
    throw new AiPipelineError(
      "AI_PIPELINE_ALL_SECTIONS_FAILED",
      "所有区域结构生成失败，请换图重试"
    );
  }

  const stepE = progress.forStep("E");
  stepE.start();
  let mapped: MapPipelineOutput;
  try {
    const draft = mergeSections({
      grounding: groundingForC,
      styleTokens: b1.tokens,
      canvas: b1.canvas,
      textExtract,
      assetManifest,
      iconQueries,
      sections,
      emailKey: input.emailKey,
      layoutVariantId: input.layoutVariantId,
    });

    mapped = mapPipelineResultToEasyEmail(draft);
    if (mapped.loweringSemantic) {
      logger.logStageEvent({
        pipelineRunId,
        stage: "E",
        emailKey: input.emailKey,
        layoutVariantId: input.layoutVariantId,
        message: "E lowering 语义缺省统计",
        detail: mapped.loweringSemantic,
      });
    }
    const bound = bindThemeRefsAfterAiLowering({
      template: mapped.template,
      tokenPresets: mapped.tokenPresets,
      draft,
    });
    mapped = { ...mapped, template: bound.template };
    logger.logStageEvent({
      pipelineRunId,
      stage: "E",
      emailKey: input.emailKey,
      layoutVariantId: input.layoutVariantId,
      message: "themeRef 升格",
      detail: { boundPaths: bound.boundPaths },
    });
    validatePipelineOutput(mapped);
    stepE.succeed();
  } catch (e) {
    stepE.fail();
    throw e;
  }

  logger.logStageEvent({
    pipelineRunId,
    stage: "E",
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
    startedAt,
    durationMs: Date.now() - tC,
  });

  return mapped;
}
