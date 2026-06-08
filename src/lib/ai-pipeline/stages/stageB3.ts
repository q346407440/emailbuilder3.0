import type { LlmClient } from "../ports/LlmClient";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import {
  buildStageB3TextExtractSystemPrompt,
  buildStageB3TextExtractUserText,
} from "../prompts/stageB3TextExtractPrompt";
import { safeParseLlmJson } from "../safeParseLlmJson";
import { normalizeTextExtractFromLlm } from "../normalizeTextExtractFromLlm";
import { rebalanceTextExtractRegions } from "../rebalanceTextExtractRegions";
import { injectTextExtractResult } from "../injectPipelineMetadata";
import type { GroundingResult, TextExtractResult } from "../types";
import type { PipelineStepProgress } from "../ports/PipelineProgressReporter";
import type { PipelineRunContext } from "../types";
import {
  appendRetryToUserText,
  feedbackFromLlmAttempt,
  LlmStageFailure,
} from "../llmRetryFeedback";

export async function runStageB3(
  ctx: PipelineRunContext,
  llm: LlmClient,
  grounding: GroundingResult,
  stepProgress?: PipelineStepProgress
): Promise<TextExtractResult> {
  try {
    return await callLlmStageWithRetry({ stage: "B3", stepProgress }, async ({ feedback }) => {
      const content = await llm.complete([
        {
          role: "system",
          content: buildStageB3TextExtractSystemPrompt(grounding.sections),
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: ctx.imageDataUrl } },
            {
              type: "text",
              text: appendRetryToUserText(buildStageB3TextExtractUserText(), feedback),
            },
          ],
        },
      ]);
      const parsed = safeParseLlmJson(content);
      if (parsed == null) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(content, null, "文案提取结果不是合法 JSON 数组")
        );
      }
      const payload = rebalanceTextExtractRegions(
        normalizeTextExtractFromLlm(parsed),
        grounding.sections
      );
      return injectTextExtractResult(payload);
    });
  } catch {
    stepProgress?.succeed();
    return injectTextExtractResult({ regions: [] });
  }
}
