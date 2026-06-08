import type { LlmClient } from "../ports/LlmClient";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import {
  buildStageCSectionSystemPrompt,
  buildStageCSectionUserText,
} from "../prompts/stageCSectionPrompt";
import { safeParseLlmJson } from "../safeParseLlmJson";
import { normalizeCompactSectionFromLlm } from "../normalizeCompactSectionFromLlm";
import {
  buildSectionAllowlists,
  validateCompactSectionRoot,
} from "../sectionCompactGuard";
import type {
  AssetManifest,
  CompactSectionTree,
  GroundingSection,
  IconQueryItem,
  NormalizedStyleTokens,
  TextExtractResult,
} from "../types";
import type { PipelineStepProgress } from "../ports/PipelineProgressReporter";
import type { PipelineRunContext } from "../types";
import { injectCompactSectionTree } from "../injectPipelineMetadata";
import {
  appendRetryToUserText,
  feedbackFromLlmAttempt,
  LlmStageFailure,
} from "../llmRetryFeedback";

export async function runStageCForSection(
  ctx: PipelineRunContext,
  llm: LlmClient,
  section: GroundingSection,
  styleTokens: NormalizedStyleTokens,
  textExtract: TextExtractResult,
  assetManifest: AssetManifest,
  iconQueries: IconQueryItem[],
  stepProgress?: PipelineStepProgress
): Promise<CompactSectionTree | null> {
  try {
    return await callLlmStageWithRetry(
      { stage: "C", sectionId: section.sectionId, stepProgress },
      async ({ feedback }) => {
        const userText = appendRetryToUserText(
          buildStageCSectionUserText(section.sectionId),
          feedback
        );
        const content = await llm.complete([
          {
            role: "system",
            content: buildStageCSectionSystemPrompt({
              section,
              styleTokens,
              textExtract,
              assetManifest,
              iconQueries,
            }),
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: ctx.imageDataUrl } },
              { type: "text", text: userText },
            ],
          },
        ]);
        const parsed = safeParseLlmJson(content);
        if (parsed == null) {
          throw new LlmStageFailure(
            feedbackFromLlmAttempt(content, null, "无法解析为 JSON 对象（需要 { \"root\": ... }）")
          );
        }
        const payload = normalizeCompactSectionFromLlm(parsed);
        if (!payload) {
          throw new LlmStageFailure(
            feedbackFromLlmAttempt(
              content,
              parsed,
              "区域结构无法解析为 compact 树",
              [
                "检查 kind 是否在白名单内",
                "纯按钮区域应使用 action.button，不要用 content.text 模拟",
                "禁止 grid 嵌套 grid；嵌套不超过 4 层",
              ]
            )
          );
        }

        const allowlists = buildSectionAllowlists(
          section.sectionId,
          section,
          textExtract,
          iconQueries,
          assetManifest
        );
        const refErrors = validateCompactSectionRoot(payload.root, allowlists, section);
        if (refErrors.length > 0) {
          throw new LlmStageFailure(
            feedbackFromLlmAttempt(content, payload, "区域结构引用校验失败", refErrors)
          );
        }

        return injectCompactSectionTree(section.sectionId, payload);
      }
    );
  } catch {
    stepProgress?.fail();
    return null;
  }
}
