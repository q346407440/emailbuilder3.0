import type { LlmClient } from "../ports/LlmClient";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import {
  buildStageB1TokenSystemPrompt,
  buildStageB1TokenUserText,
} from "../prompts/stageB1TokenPrompt";
import { safeParseLlmJson } from "../safeParseLlmJson";
import {
  fallbackStyleTokensPayload,
  normalizeStyleTokensFromLlm,
} from "../normalizeStyleTokensFromLlm";
import { normalizeStyleTokens } from "../normalizeStyleTokens";
import type { GroundingResult, NormalizedStyleTokens, StyleTokensResult } from "../types";
import type { PipelineRunContext } from "../types";
import type { PipelineStepProgress } from "../ports/PipelineProgressReporter";
import { injectStyleTokensResult } from "../injectPipelineMetadata";
import {
  appendRetryToUserText,
  feedbackFromLlmAttempt,
  LlmStageFailure,
} from "../llmRetryFeedback";

export type StageB1Result = {
  raw: StyleTokensResult;
  tokens: NormalizedStyleTokens;
  canvas: StyleTokensResult["canvas"];
};

export async function runStageB1(
  ctx: PipelineRunContext,
  llm: LlmClient,
  grounding: GroundingResult,
  stepProgress?: PipelineStepProgress
): Promise<StageB1Result> {
  try {
    const raw = await callLlmStageWithRetry({ stage: "B1", stepProgress }, async ({ feedback }) => {
      const content = await llm.complete([
        { role: "system", content: buildStageB1TokenSystemPrompt(grounding.sections) },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: ctx.imageDataUrl } },
            {
              type: "text",
              text: appendRetryToUserText(buildStageB1TokenUserText(), feedback),
            },
          ],
        },
      ]);
      const parsed = safeParseLlmJson(content);
      if (parsed == null) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(content, null, "无法解析为 JSON 对象")
        );
      }
      const payload = normalizeStyleTokensFromLlm(parsed);
      if (!payload) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(content, parsed, "样式档位结果字段不合法或缺失")
        );
      }
      return injectStyleTokensResult(payload);
    });
    const tokens = normalizeStyleTokens(raw);
    return { raw, tokens, canvas: raw.canvas };
  } catch {
    stepProgress?.succeed();
    const fallback = injectStyleTokensResult(fallbackStyleTokensPayload());
    return {
      raw: fallback,
      tokens: normalizeStyleTokens(fallback),
      canvas: fallback.canvas,
    };
  }
}
