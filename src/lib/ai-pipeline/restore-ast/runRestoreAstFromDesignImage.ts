import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { AI_PIPELINE_LLM_MAX_TRANSIENT_RETRIES } from "../../../layout-variant-ai-contract/constants";
import { RESTORE_AST_UI_STEPS_INITIAL } from "../../../layout-variant-ai-contract/progress";
import { AiPipelineError } from "../../../layout-variant-ai-contract/errors";
import type { EmailTemplate } from "../../../types/email";
import type { TokenPresets } from "../../../types/tokenPreset";
import {
  astToTemplate,
  backfillTemplateFromManifest,
  remapResolvedManifestToRequests,
  resolveAstAssetRequests,
} from "../../../restore-ast-contract";
import { serializeTemplateToDisk } from "../../templateTreeAdapter";
import { blockingValidationIssues, validateTemplate } from "../../validate";
import { validateTokenPresets } from "../../../token-preset-contract/validate";
import { createDefaultLlmClient, createLlmClientFromProfile } from "../createLlmClient";
import type { LlmProfileSelection } from "../../../layout-variant-ai-contract/llmProfileCatalog";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import { wrapLlmClientWithQueue } from "../llmRequestQueue";
import { LlmStageFailure, feedbackFromLlmAttempt } from "../llmRetryFeedback";
import {
  createNoopPipelineProgressReporter,
  type PipelineProgressReporter,
} from "../ports/PipelineProgressReporter";
import { stepStart } from "../stepTiming";
import { buildRestoreAstUserText, RESTORE_AST_SYSTEM_PROMPT } from "./promptsRestoreAst";
import { parseRestoreAstDocument } from "./parseRestoreAstDocument";
import { getRestoreAstResponseFormat, resolveRestoreAstLlmResponseFormat } from "./restoreAstResponseFormat";
import { createRestoreAstRunLog } from "./restoreAstRunLog";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const LOG_TAG = "[restore-ast]";
const RESTORE_AST_GENERATE_TIMEOUT_MS = 240_000;

export type RunRestoreAstFromDesignImageInput = {
  emailKey: string;
  layoutVariantId: string;
  layoutLabel: string;
  imagePath: string;
  imageBuffer: Buffer;
  mimeType: string;
  stagingDir: string;
  locale?: string;
};

export type RunRestoreAstFromDesignImageOptions = {
  progress?: PipelineProgressReporter;
  llmProfile?: LlmProfileSelection;
};

export type RunRestoreAstFromDesignImageResult = {
  template: EmailTemplate;
  tokenPresets: TokenPresets;
  logDir: string;
  validationIssues: string[];
};

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const normalized = mimeType.trim() || "image/png";
  return `data:${normalized};base64,${buffer.toString("base64")}`;
}

function deriveIdPrefix(emailKey: string, layoutVariantId: string): string {
  const raw = `${emailKey}-${layoutVariantId}`.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return raw.slice(0, 48) || "restore-ast";
}

function mimeToExtension(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return ".jpg";
  if (normalized.includes("webp")) return ".webp";
  return ".png";
}

/** RestoreAst 三步骤管线：LLM 写 JSON → 搜图/图标 → 组装器（失败不重试）。 */
export async function runRestoreAstFromDesignImage(
  input: RunRestoreAstFromDesignImageInput,
  options: RunRestoreAstFromDesignImageOptions = {}
): Promise<RunRestoreAstFromDesignImageResult> {
  const progress = options.progress ?? createNoopPipelineProgressReporter();
  const pipelineRunId = randomUUID();
  const logDir = path.join(REPO_ROOT, "logs", `restore-ast-${pipelineRunId.slice(0, 8)}`);
  const runLog = createRestoreAstRunLog(logDir, {
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
  });
  const totalStart = performance.now();
  const locale = input.locale?.trim() || "en-US";
  const idPrefix = deriveIdPrefix(input.emailKey, input.layoutVariantId);

  progress.emitPlan([...RESTORE_AST_UI_STEPS_INITIAL], { display: "pending" });

  await fs.mkdir(input.stagingDir, { recursive: true });
  await fs.mkdir(logDir, { recursive: true });

  const designExt = mimeToExtension(input.mimeType);
  const designLogPath = runLog.logPath(`design${designExt}`);
  await fs.writeFile(designLogPath, input.imageBuffer);
  await fs.copyFile(designLogPath, path.join(input.stagingDir, `design${designExt}`)).catch(() => {
    /* staging 设计图副本可选 */
  });

  const imageDataUrl = bufferToDataUrl(input.imageBuffer, input.mimeType);
  const baseLlm = options.llmProfile
    ? createLlmClientFromProfile(options.llmProfile, {
        timeoutMs: RESTORE_AST_GENERATE_TIMEOUT_MS,
      })
    : createDefaultLlmClient(RESTORE_AST_GENERATE_TIMEOUT_MS);
  const llm = wrapLlmClientWithQueue(baseLlm);

  try {
    const generateStep = progress.forStep("RA:GenerateAst");
    generateStep.start(1, {
      detail: options.llmProfile
        ? `${options.llmProfile.vendor} RestoreAst API`
        : "RestoreAst LLM API",
      maxAttempts: 1 + AI_PIPELINE_LLM_MAX_TRANSIENT_RETRIES,
    });
    const tGenerate = stepStart();

    const restoreAstResponseFormat = resolveRestoreAstLlmResponseFormat({
      profile: options.llmProfile,
    });

    const doc = await callLlmStageWithRetry(
      {
        stage: "RA:GenerateAst",
        stepProgress: generateStep,
        maxRetries: 0,
        maxTransientRetries: AI_PIPELINE_LLM_MAX_TRANSIENT_RETRIES,
        timeoutMs: RESTORE_AST_GENERATE_TIMEOUT_MS,
      },
      async () => {
        const raw = await llm.complete(
          [
            { role: "system", content: RESTORE_AST_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageDataUrl } },
                {
                  type: "text",
                  text: buildRestoreAstUserText({ emailKey: input.emailKey, locale }),
                },
              ],
            },
          ],
          restoreAstResponseFormat
        );
        await fs.writeFile(runLog.logPath("01-llm-raw.txt"), raw, "utf8");
        try {
          return parseRestoreAstDocument(raw);
        } catch (e) {
          if (e instanceof AiPipelineError) {
            throw new LlmStageFailure(
              feedbackFromLlmAttempt(raw, null, e.message),
              e.message
            );
          }
          throw e;
        }
      }
    );

    await fs.writeFile(
      runLog.logPath("02-restore-ast.json"),
      `${JSON.stringify(doc, null, 2)}\n`,
      "utf8"
    );
    runLog.record("生成 RestoreAst JSON", tGenerate, { stepId: "RA:GenerateAst" });

    const resolveStep = progress.forStep("RA:ResolveAssets");
    resolveStep.start(1, { maxAttempts: 1 });
    const tResolve = stepStart();

    let manifest;
    let resolveDone = false;
    try {
      const assembledDraft = astToTemplate(doc, {
        emailId: input.emailKey,
        templateId: input.emailKey,
        locale,
        idPrefix,
        tokenPresetLabel: input.layoutLabel.trim() || input.layoutVariantId,
      });

      await fs.writeFile(
        runLog.logPath("03-assets-request.json"),
        `${JSON.stringify(assembledDraft.assets, null, 2)}\n`,
        "utf8"
      );

      manifest = await resolveAstAssetRequests(assembledDraft.assets);
      await fs.writeFile(
        runLog.logPath("04-assets-resolved.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
      );

      resolveStep.succeed();
      resolveDone = true;
      runLog.record("搜索远程素材", tResolve, {
        stepId: "RA:ResolveAssets",
        detail: `${manifest.items.filter((i) => i.ok).length}/${manifest.items.length}`,
      });

      const assembleStep = progress.forStep("RA:Assemble");
      assembleStep.start(1, { maxAttempts: 1 });
      const tAssemble = stepStart();

      const mapped = remapResolvedManifestToRequests(manifest, assembledDraft.assets);
      const backfilled = backfillTemplateFromManifest(
        assembledDraft.template,
        mapped,
        assembledDraft.assets
      );

      const templateDisk = serializeTemplateToDisk(backfilled.template);
      await fs.writeFile(
        path.join(input.stagingDir, "template.json"),
        `${JSON.stringify(templateDisk, null, 2)}\n`,
        "utf8"
      );
      await fs.writeFile(
        path.join(input.stagingDir, "tokenPresets.json"),
        `${JSON.stringify(assembledDraft.tokenPresets, null, 2)}\n`,
        "utf8"
      );

      await fs.writeFile(
        runLog.logPath("05-template.json"),
        `${JSON.stringify(templateDisk, null, 2)}\n`,
        "utf8"
      );
      await fs.writeFile(
        runLog.logPath("06-tokenPresets.json"),
        `${JSON.stringify(assembledDraft.tokenPresets, null, 2)}\n`,
        "utf8"
      );

      const blockIdMap = Object.fromEntries(assembledDraft.blockIdToAstPath.entries());
      await fs.writeFile(
        runLog.logPath("07-block-id-map.json"),
        `${JSON.stringify(blockIdMap, null, 2)}\n`,
        "utf8"
      );

      const templateIssues = validateTemplate(backfilled.template);
      const blocking = blockingValidationIssues(templateIssues);
      const tokenIssues = validateTokenPresets(assembledDraft.tokenPresets);

      if (blocking.length > 0) {
        await fs.writeFile(
          runLog.logPath("08-validate-blocking.json"),
          `${JSON.stringify(blocking, null, 2)}\n`,
          "utf8"
        );
        throw new AiPipelineError(
          "VALIDATE_TEMPLATE_FAILED",
          `模板校验未通过（${blocking.length} 条 blocking）`
        );
      }

      if (tokenIssues.length > 0) {
        await fs.writeFile(
          runLog.logPath("08-validate-tokenPresets.json"),
          `${JSON.stringify(tokenIssues, null, 2)}\n`,
          "utf8"
        );
        throw new AiPipelineError("VALIDATION_FAILED", "样式预设校验未通过");
      }

      assembleStep.succeed();
      runLog.record("组装并校验", tAssemble, { stepId: "RA:Assemble" });
      runLog.finish({ ok: true, startMs: totalStart });

      console.log(`${LOG_TAG} 完成 logDir=${logDir}`);

      return {
        template: backfilled.template,
        tokenPresets: assembledDraft.tokenPresets,
        logDir,
        validationIssues: templateIssues
          .filter((issue) => issue.level === "warning")
          .map((issue) => `${issue.path}: ${issue.reason}`),
      };
    } catch (stepError) {
      if (!resolveDone) {
        resolveStep.fail();
      } else {
        progress.forStep("RA:Assemble").fail();
      }
      throw stepError;
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "RestoreAst 管线失败";
    runLog.finish({ ok: false, startMs: totalStart, error: message });
    console.error(`${LOG_TAG} 失败:`, message);
    throw e;
  }
}
