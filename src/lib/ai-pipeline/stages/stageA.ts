import type { LlmClient } from "../ports/LlmClient";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import { injectGroundingResult } from "../injectPipelineMetadata";
import {
  buildStageAGroundingSystemPrompt,
  buildStageAGroundingUserText,
} from "../prompts/stageAGroundingPrompt";
import { safeParseLlmJson } from "../safeParseLlmJson";
import {
  normalizeGroundingFromLlm,
  singleSectionGroundingPayload,
} from "../normalizeGroundingFromLlm";
import type { GroundingResult } from "../types";
import type { PipelineRunContext } from "../types";
import type { PipelineStepProgress } from "../ports/PipelineProgressReporter";
import {
  appendRetryToUserText,
  feedbackFromLlmAttempt,
  LlmStageFailure,
} from "../llmRetryFeedback";

export async function runStageA(
  ctx: PipelineRunContext,
  llm: LlmClient,
  stepProgress?: PipelineStepProgress
): Promise<GroundingResult> {
  try {
    return await callLlmStageWithRetry({ stage: "A", stepProgress }, async ({ feedback }) => {
      const content = await llm.complete([
        { role: "system", content: buildStageAGroundingSystemPrompt() },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: ctx.imageDataUrl } },
            {
              type: "text",
              text: appendRetryToUserText(buildStageAGroundingUserText(), feedback),
            },
          ],
        },
      ]);
      const parsed = safeParseLlmJson(content);
      if (parsed == null) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(content, null, "无法解析为 JSON 数组")
        );
      }
      const payload = normalizeGroundingFromLlm(parsed);
      if (!payload) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(content, parsed, "区域划分结果为空或字段不合法")
        );
      }
      return injectGroundingResult(payload);
    });
  } catch {
    stepProgress?.succeed();
    return injectGroundingResult(singleSectionGroundingPayload());
  }
}
