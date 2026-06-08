import type { LlmClient } from "../ports/LlmClient";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import {
  buildStageB2IconSystemPrompt,
  buildStageB2IconUserText,
} from "../prompts/stageB2IconPrompt";
import { listSimpleIconSlugsForPrompt, listTablerIconSlugsForPrompt } from "../iconCdnResolve";
import { safeParseLlmJson } from "../safeParseLlmJson";
import { normalizeIconQueriesFromLlm } from "../normalizeIconQueriesFromLlm";
import type { GroundingResult, IconQueryItem } from "../types";
import type { PipelineStepProgress } from "../ports/PipelineProgressReporter";
import type { PipelineRunContext } from "../types";
import {
  appendRetryToUserText,
  feedbackFromLlmAttempt,
  LlmStageFailure,
} from "../llmRetryFeedback";

export async function runStageB2(
  ctx: PipelineRunContext,
  llm: LlmClient,
  grounding: GroundingResult,
  stepProgress?: PipelineStepProgress
): Promise<IconQueryItem[]> {
  try {
    return await callLlmStageWithRetry({ stage: "B2", stepProgress }, async ({ feedback }) => {
      const content = await llm.complete([
        {
          role: "system",
          content: buildStageB2IconSystemPrompt(
            grounding.sections,
            listSimpleIconSlugsForPrompt(),
            listTablerIconSlugsForPrompt()
          ),
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: ctx.imageDataUrl } },
            {
              type: "text",
              text: appendRetryToUserText(buildStageB2IconUserText(), feedback),
            },
          ],
        },
      ]);
      const parsed = safeParseLlmJson(content);
      if (parsed == null) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(content, null, "图标识别结果不是合法 JSON 数组")
        );
      }
      return normalizeIconQueriesFromLlm(parsed);
    });
  } catch {
    stepProgress?.succeed();
    return [];
  }
}
