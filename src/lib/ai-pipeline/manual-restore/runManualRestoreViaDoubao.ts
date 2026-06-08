import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createDoubaoRawClient } from "../adapters/doubaoClient";
import { llmExchangeContextStore } from "../llmCallContext";
import { wrapLlmClientWithQueue } from "../llmRequestQueue";
import { feedbackFromLlmAttempt, LlmStageFailure } from "../llmRetryFeedback";
import {
  createNoopPipelineProgressReporter,
  type PipelineProgressReporter,
} from "../ports/PipelineProgressReporter";
import { MANUAL_RESTORE_MJS_UI_STEPS_INITIAL, MANUAL_RESTORE_MJS_MAX_ATTEMPTS, formatManualRestoreAttemptLabel } from "../../../layout-variant-ai-contract/progress";
import { buildMjsGeneratorSystemPrompt, buildMjsGeneratorUserText } from "./promptsMjs";
import { buildMjsPatchSystemPrompt, buildMjsPatchUserText } from "./promptsMjsEdit";
import { assertMjsComplete, extractMjsBodyFromLlm, parseEmailKeyFromMjs } from "./extractMjsFromLlm";
import type { InjectedMjsAssets } from "./injectedMjsAssets";
import { formatInjectedAssetsForMjs } from "./injectedMjsAssets";
import { assembleMjsFromBody, deriveMjsIdPrefix, type MjsScaffoldContext } from "./mjsScaffold";
import {
  assertNoHallucinatedAssetUrls,
  resolveMjsAssetsFromDesign,
} from "./resolveMjsAssetsFromDesign";
import { deriveDesignCopyPath } from "./manualRestorePaths";
import type { ManualRestorePersistMode, ManualRestoreRunInput, ManualRestoreRunResult } from "./types";
import { logStepDone, stepStart } from "./stepTiming";
import { applyMjsAutofix } from "./mjsAutofix";
import { literalizeMjsThemeRefs } from "./mjsLiteralize";
import { applyMjsPatches, extractMjsPatchesFromLlm } from "./mjsPatchApply";
import { buildMjsErrorSnippets } from "./mjsLocateSnippets";
import { runMjsAndValidate } from "./mjsRunValidate";
import { buildMjsFullRegenHint } from "./mjsRegenHint";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const LOG_TAG = "[manual-restore:mjs]";
/** 首次整段生成 mjs 可能较长（复杂模板偶发 >5min） */
const MJS_GENERATE_TIMEOUT_MS = 420_000;
const MJS_PATCH_TIMEOUT_MS = 180_000;
/** 完整 mjs 约 600 行，需足够 token 避免截断 */
const MJS_MAX_TOKENS = 32_768;
const MJS_PATCH_MAX_TOKENS = 16_384;
/** 首次生成 + 最多 2 次重试（validate / node 执行失败走 autofix+patch，其它失败整段重写） */
const MAX_MJS_ATTEMPTS = MANUAL_RESTORE_MJS_MAX_ATTEMPTS;

const MJS_PROGRESS_OPTS = { maxAttempts: MAX_MJS_ATTEMPTS } as const;

function mjsAttemptDetail(message: string, attempt: number): string {
  return `${message}（${formatManualRestoreAttemptLabel(attempt, MAX_MJS_ATTEMPTS)}）`;
}

type FailureKind = "validate" | "node" | "generate";

type AttemptFailure = {
  kind: FailureKind;
  errors: string[];
  rawContent?: string;
};

function isPatchRetryKind(kind: FailureKind | undefined): boolean {
  return kind === "validate" || kind === "node";
}

function canUsePatchRetryPath(
  attempt: number,
  lastFailure: AttemptFailure | null,
  mjsSource: string
): boolean {
  return attempt > 1 && mjsSource.length > 0 && isPatchRetryKind(lastFailure?.kind);
}

function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const normalized = mimeType.trim() || "image/png";
  return `data:${normalized};base64,${buffer.toString("base64")}`;
}

function guessMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function slugFromEmailKey(emailKey: string): string {
  return emailKey.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function mjsFileName(emailKey: string, layoutVariantId?: string): string {
  const emailSlug = slugFromEmailKey(emailKey);
  if (layoutVariantId) {
    const variantSlug = layoutVariantId.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `generate-doubao-${emailSlug}-${variantSlug}-layout.mjs`;
  }
  return `generate-doubao-${emailSlug}-layout.mjs`;
}

function finalizeMjsSource(source: string, errorLines: string[] = []): string {
  const fixed = applyMjsAutofix(source, errorLines);
  return literalizeMjsThemeRefs(fixed.source).source;
}

type MjsPostProcessResult =
  | { ok: true; source: string; errors: [] }
  | { ok: false; source: string; errors: string[] }
  | { ok: false; source: ""; errors: string[] };

/** 拼接 mjs；可恢复错误（截断/完整性）仍返回 source 供 patch 路径修复。 */
function tryPostProcessMjs(
  rawMjs: string,
  injectedAssets: InjectedMjsAssets,
  scaffold: MjsScaffoldContext
): MjsPostProcessResult {
  let body: string;
  try {
    body = extractMjsBodyFromLlm(rawMjs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "提取 mjs body 失败";
    return { ok: false, source: "", errors: [msg] };
  }

  let mjsSource = assembleMjsFromBody({ body, scaffold, injected: injectedAssets });
  mjsSource = finalizeMjsSource(mjsSource);
  const errors: string[] = [];

  try {
    assertNoHallucinatedAssetUrls(mjsSource, injectedAssets);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "资产 URL 校验失败");
  }

  try {
    assertMjsComplete(mjsSource);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "mjs 完整性校验失败");
  }

  if (errors.length > 0) {
    return { ok: false, source: mjsSource, errors };
  }
  return { ok: true, source: mjsSource, errors: [] };
}

function mergeRunIssues(post: MjsPostProcessResult, runIssues: string[]): string[] {
  const head = post.ok ? [] : post.errors;
  const tail = runIssues.filter((line) => !head.includes(line));
  return [...head, ...tail];
}

function buildValidateOpts(
  scaffold: MjsScaffoldContext,
  emailKey: string
): Pick<
  Parameters<typeof runMjsAndValidate>[0],
  "validateScene" | "outputTemplatePath" | "outputTokenPresetsPath" | "fallbackEmailKey"
> {
  if (scaffold.persistMode === "layout-only") {
    const outDir = scaffold.outDirExpr;
    return {
      validateScene: false,
      outputTemplatePath: path.join(outDir, "template.json"),
      outputTokenPresetsPath: path.join(outDir, "tokenPresets.json"),
      fallbackEmailKey: emailKey,
    };
  }
  return { validateScene: true, fallbackEmailKey: emailKey };
}

/**
 * 豆包模拟 Cursor Agent「手工还原」：
 * 1) 程序注入 skills/rules；看图 MR:AssetSlots → Pexels/CDN 得到 PEXELS/ICON
 * 2) 豆包产出 mjs body；程序拼 header/footer；validate 失败时 autofix → 豆包 SEARCH/REPLACE 局部修补
 * 3) node 执行 + validate
 */
export async function runManualRestoreViaDoubao(
  input: ManualRestoreRunInput
): Promise<ManualRestoreRunResult> {
  const imagePath = path.resolve(input.imagePath);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`设计图不存在: ${imagePath}`);
  }

  const emailKey = input.outputEmailKey.trim();
  if (!emailKey) {
    throw new Error("outputEmailKey 为必填");
  }

  const persistMode: ManualRestorePersistMode = input.persistMode ?? "full-email";
  if (persistMode === "layout-only") {
    if (!input.stagingDir?.trim()) {
      throw new Error("layout-only 模式须提供 stagingDir");
    }
    if (!input.layoutVariantId?.trim()) {
      throw new Error("layout-only 模式须提供 layoutVariantId");
    }
  }

  const displayName = input.displayName?.trim() || emailKey;
  const designCopyPath =
    input.designCopyPath ?? deriveDesignCopyPath(REPO_ROOT, emailKey);
  const stagingDir =
    persistMode === "layout-only" ? path.resolve(input.stagingDir!) : null;

  const mjsScaffold: MjsScaffoldContext = {
    emailKey,
    displayName,
    idPrefix: deriveMjsIdPrefix(emailKey),
    imagePath,
    designCopyPath,
    persistMode,
    outDirExpr:
      persistMode === "layout-only"
        ? stagingDir!
        : path.join(REPO_ROOT, "data/emails", emailKey, "layouts/default"),
  };

  const progress = input.progress ?? createNoopPipelineProgressReporter();
  progress.emitPlan([...MANUAL_RESTORE_MJS_UI_STEPS_INITIAL], { display: "hidden" });

  const pipelineRunId = randomUUID();
  const logDir = path.join(REPO_ROOT, "logs", `manual-restore-mjs-${pipelineRunId.slice(0, 8)}`);
  fs.mkdirSync(logDir, { recursive: true });
  if (stagingDir) {
    fs.mkdirSync(stagingDir, { recursive: true });
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const imageDataUrl = bufferToDataUrl(imageBuffer, guessMime(imagePath));

  const mjsPath =
    input.mjsPath ??
    path.join(
      REPO_ROOT,
      "scripts",
      mjsFileName(emailKey, persistMode === "layout-only" ? input.layoutVariantId : undefined)
    );

  const validateBase = buildValidateOpts(mjsScaffold, emailKey);
  const runValidate = (source: string) =>
    runMjsAndValidate({
      mjsSource: source,
      mjsPath,
      repoRoot: REPO_ROOT,
      ...validateBase,
    });

  const generateStep = progress.forStep("MR:MjsGenerate");
  const validateStep = progress.forStep("MR:RunValidate");

  const tAssets = stepStart();
  console.log(`${LOG_TAG} 程序：资产槽 → Pexels/CDN 解析 …`);
  let injectedAssets: InjectedMjsAssets;
  injectedAssets = await resolveMjsAssetsFromDesign({
    imageDataUrl,
    emailKey,
    displayName,
    progress,
  });
  logStepDone(LOG_TAG, "资产注入完成", tAssets);
  fs.writeFileSync(
    path.join(logDir, "00-injected-assets.txt"),
    `${formatInjectedAssetsForMjs(injectedAssets)}\n\n${injectedAssets.slotGuide}\n`
  );

  const generateLlm = wrapLlmClientWithQueue(
    createDoubaoRawClient(MJS_GENERATE_TIMEOUT_MS, { maxTokens: MJS_MAX_TOKENS })
  );
  const patchLlm = wrapLlmClientWithQueue(
    createDoubaoRawClient(MJS_PATCH_TIMEOUT_MS, { maxTokens: MJS_PATCH_MAX_TOKENS })
  );

  try {
    return await llmExchangeContextStore.run(
      { pipelineRunId, emailKey, stage: "manual-restore-mjs" },
      async () => {
        console.log(`${LOG_TAG} 注入上下文 → 豆包写 mjs（首次整段 / validate 失败则局部 patch）…`);
        const tMjsGenerate = stepStart();

        let mjsSource = "";
        let mjsStdout = "";
        let lastFailure: AttemptFailure | null = null;

        for (let attempt = 1; attempt <= MAX_MJS_ATTEMPTS; attempt += 1) {
          const tAttempt = stepStart();
          let attemptOk = false;
          try {
            const useValidatePatchPath = canUsePatchRetryPath(attempt, lastFailure, mjsSource);

            if (attempt === 1) {
              generateStep.start(1, {
                detail: "豆包 MR:MjsGenerate API · 首次",
                ...MJS_PROGRESS_OPTS,
              });
            } else if (isPatchRetryKind(lastFailure?.kind)) {
              generateStep.retry(attempt, {
                detail: mjsAttemptDetail("程序 autofix → 豆包 patch", attempt),
                ...MJS_PROGRESS_OPTS,
              });
            } else {
              generateStep.start(attempt, {
                detail: mjsAttemptDetail("豆包 MR:MjsGenerate API · 整段重写", attempt),
                ...MJS_PROGRESS_OPTS,
              });
            }

            if (useValidatePatchPath) {
              const tAutofix = stepStart();
              console.log(`${LOG_TAG}   程序 autofix（尝试 ${attempt}）…`);
              generateStep.logDetail(mjsAttemptDetail("程序 autofix", attempt), {
                attempt,
                ...MJS_PROGRESS_OPTS,
              });
              const autofix = applyMjsAutofix(mjsSource, lastFailure!.errors);
              if (autofix.changed) {
                mjsSource = finalizeMjsSource(autofix.source, lastFailure!.errors);
                fs.writeFileSync(path.join(logDir, `03-autofix-attempt-${attempt}.mjs`), mjsSource);
                logStepDone(
                  LOG_TAG,
                  `  程序 autofix 完成（尝试 ${attempt}）`,
                  tAutofix,
                  autofix.fixes.join(" · ")
                );

                const tNodeAutofix = stepStart();
                const autofixRun = runValidate(mjsSource);
                fs.writeFileSync(
                  path.join(logDir, `02-mjs-run-attempt-${attempt}-autofix.log`),
                  autofixRun.mjsStdout
                );
                logStepDone(LOG_TAG, `  node+validate（autofix 后，尝试 ${attempt}）`, tNodeAutofix);

                if (autofixRun.ok) {
                  mjsStdout = autofixRun.mjsStdout;
                  generateStep.succeed();
                  validateStep.start(attempt, {
                    detail: mjsAttemptDetail("node 执行 mjs（autofix 后）", attempt),
                    ...MJS_PROGRESS_OPTS,
                  });
                  validateStep.succeed();
                  attemptOk = true;
                  break;
                }
                generateStep.logDetail(
                  mjsAttemptDetail(
                    `autofix 后 validate 仍失败（${autofixRun.allIssues.length} 条），继续 patch`,
                    attempt
                  ),
                  { attempt, ...MJS_PROGRESS_OPTS }
                );
              } else {
                logStepDone(LOG_TAG, `  程序 autofix 无改动（尝试 ${attempt}）`, tAutofix);
              }

              const tPatchLlm = stepStart();
              console.log(`${LOG_TAG}   豆包 MR:MjsPatch API（尝试 ${attempt}）…`);
              generateStep.logDetail(mjsAttemptDetail("豆包 MR:MjsPatch API", attempt), {
                attempt,
                ...MJS_PROGRESS_OPTS,
              });
              const snippets = buildMjsErrorSnippets(mjsSource, lastFailure!.errors);
              const rawPatch = await patchLlm.complete([
                { role: "system", content: buildMjsPatchSystemPrompt() },
                {
                  role: "user",
                  content: buildMjsPatchUserText(mjsSource, lastFailure!.errors, snippets),
                },
              ]);
              logStepDone(LOG_TAG, `  豆包 Patch API 返回（尝试 ${attempt}）`, tPatchLlm);
              fs.writeFileSync(path.join(logDir, `04-patch-raw-attempt-${attempt}.txt`), rawPatch);

              const tApply = stepStart();
              const patches = extractMjsPatchesFromLlm(rawPatch);
              const applied = applyMjsPatches(mjsSource, patches);
              if (applied.applied === 0) {
                logStepDone(
                  LOG_TAG,
                  `  补丁未命中，下轮改整段重写（尝试 ${attempt}）`,
                  tApply,
                  applied.failures.slice(0, 3).join("; ")
                );
                generateStep.failAttempt(attempt, {
                  detail: mjsAttemptDetail("补丁未命中，下轮改整段重写", attempt),
                  ...MJS_PROGRESS_OPTS,
                });
                lastFailure = {
                  kind: "generate",
                  errors: [
                    "补丁未命中任何 SEARCH 块",
                    ...applied.failures,
                    ...lastFailure!.errors.slice(0, 10),
                  ],
                  rawContent: rawPatch,
                };
                if (attempt >= MAX_MJS_ATTEMPTS) {
                  throw new LlmStageFailure(
                    feedbackFromLlmAttempt(rawPatch, null, "补丁未命中", applied.failures)
                  );
                }
                continue;
              }
              mjsSource = finalizeMjsSource(applied.source);
              logStepDone(
                LOG_TAG,
                `  应用补丁 ${applied.applied} 处（尝试 ${attempt}）`,
                tApply,
                applied.failures.length > 0 ? applied.failures.join("; ") : undefined
              );
              fs.writeFileSync(path.join(logDir, `05-patched-attempt-${attempt}.mjs`), mjsSource);
              generateStep.succeed();

              validateStep.start(attempt, {
                detail: mjsAttemptDetail("node 执行 mjs（patch 后）", attempt),
                ...MJS_PROGRESS_OPTS,
              });
              const tNode = stepStart();
              console.log(`${LOG_TAG}   node 执行 mjs（patch 后，尝试 ${attempt}）…`);
              const patchRun = runValidate(mjsSource);
              fs.writeFileSync(
                path.join(logDir, `02-mjs-run-attempt-${attempt}.log`),
                patchRun.mjsStdout
              );
              logStepDone(LOG_TAG, `  node 执行完成（patch 后，尝试 ${attempt}）`, tNode);

              if (!patchRun.ok && patchRun.nodeFailed) {
                validateStep.failAttempt(attempt, {
                  detail: mjsAttemptDetail("patch 后 mjs 执行失败", attempt),
                  ...MJS_PROGRESS_OPTS,
                });
                lastFailure = { kind: "node", errors: patchRun.allIssues, rawContent: mjsSource };
                logStepDone(
                  LOG_TAG,
                  `  mjs 执行失败（patch 后，尝试 ${attempt}）`,
                  tNode
                );
                if (attempt >= MAX_MJS_ATTEMPTS) {
                  throw new LlmStageFailure(
                    feedbackFromLlmAttempt(
                      mjsSource,
                      null,
                      "patch 后 mjs 执行失败",
                      patchRun.allIssues
                    )
                  );
                }
                continue;
              }

              const tValidate = stepStart();
              if (!patchRun.ok) {
                validateStep.failAttempt(attempt, {
                  detail: mjsAttemptDetail("validate 未通过（patch 后）", attempt),
                  ...MJS_PROGRESS_OPTS,
                });
                lastFailure = { kind: "validate", errors: patchRun.allIssues };
                logStepDone(
                  LOG_TAG,
                  `  validate 未通过（patch 后，尝试 ${attempt}）`,
                  tValidate
                );
                if (attempt >= MAX_MJS_ATTEMPTS) {
                  throw new LlmStageFailure(
                    feedbackFromLlmAttempt(
                      mjsSource,
                      null,
                      "validate 未通过",
                      patchRun.allIssues.slice(0, 25)
                    )
                  );
                }
                continue;
              }
              logStepDone(LOG_TAG, `  validate 通过（patch 后，尝试 ${attempt}）`, tValidate);
              generateStep.succeed();
              validateStep.succeed();
              mjsStdout = patchRun.mjsStdout;
              attemptOk = true;
              break;
            }

            const regenHint =
              lastFailure?.kind === "generate" && lastFailure.errors.length > 0
                ? buildMjsFullRegenHint({
                    previousOutput: lastFailure.rawContent ?? mjsSource,
                    errors: lastFailure.errors,
                  })
                : "";

            const tLlm = stepStart();
            console.log(
              `${LOG_TAG}   豆包 MR:MjsGenerate API（尝试 ${attempt}${regenHint ? " · 整段重写" : " · 首次"}）…`
            );
            const rawMjs = await generateLlm.complete([
              { role: "system", content: buildMjsGeneratorSystemPrompt(injectedAssets) },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: imageDataUrl } },
                  {
                    type: "text",
                    text:
                      buildMjsGeneratorUserText({
                        idPrefix: mjsScaffold.idPrefix,
                        injected: injectedAssets,
                      }) + regenHint,
                  },
                ],
              },
            ]);
            logStepDone(LOG_TAG, `  豆包 API 返回（尝试 ${attempt}）`, tLlm);
            fs.writeFileSync(path.join(logDir, `01-llm-raw-attempt-${attempt}.txt`), rawMjs);

            const tPost = stepStart();
            const post = tryPostProcessMjs(rawMjs, injectedAssets, mjsScaffold);
            if (!post.ok && post.source === "") {
              logStepDone(LOG_TAG, `  程序处理 mjs 失败（尝试 ${attempt}）`, tPost);
              const detail = mjsAttemptDetail("程序处理 mjs 失败", attempt);
              generateStep.failAttempt(attempt, { detail, ...MJS_PROGRESS_OPTS });
              lastFailure = {
                kind: "generate",
                errors: post.errors,
                rawContent: rawMjs,
              };
              if (attempt >= MAX_MJS_ATTEMPTS) {
                throw new LlmStageFailure(
                  feedbackFromLlmAttempt(rawMjs, null, post.errors[0] ?? "提取 mjs 失败", post.errors)
                );
              }
              continue;
            }

            mjsSource = post.source;
            if (post.ok) {
              logStepDone(LOG_TAG, `  程序处理并写入 mjs（尝试 ${attempt}）`, tPost, mjsPath);
              generateStep.succeed();
            } else {
              logStepDone(
                LOG_TAG,
                `  程序处理 mjs 失败（尝试 ${attempt}）`,
                tPost,
                post.errors.join(" · ")
              );
              fs.writeFileSync(path.join(logDir, `01-postprocess-warn-attempt-${attempt}.txt`), post.errors.join("\n"));
              const detail = mjsAttemptDetail(
                `程序处理 mjs 失败（${post.errors[0] ?? "完整性校验未通过"}）`,
                attempt
              );
              generateStep.failAttempt(attempt, { detail, ...MJS_PROGRESS_OPTS });
              lastFailure = { kind: "node", errors: post.errors, rawContent: rawMjs };
              if (attempt >= MAX_MJS_ATTEMPTS) {
                throw new LlmStageFailure(
                  feedbackFromLlmAttempt(mjsSource, null, post.errors[0] ?? "mjs 执行失败", post.errors)
                );
              }
              continue;
            }

            validateStep.start(attempt, {
              detail: mjsAttemptDetail("node 执行 mjs", attempt),
              ...MJS_PROGRESS_OPTS,
            });
            const tNode = stepStart();
            console.log(`${LOG_TAG}   node 执行 mjs（尝试 ${attempt}）…`);
            const genRun = runValidate(mjsSource);
            fs.writeFileSync(path.join(logDir, `02-mjs-run-attempt-${attempt}.log`), genRun.mjsStdout);
            logStepDone(LOG_TAG, `  node 执行完成（尝试 ${attempt}）`, tNode);

            const runIssues = mergeRunIssues(post, genRun.allIssues);

            if (genRun.nodeFailed && !genRun.ok) {
              validateStep.failAttempt(attempt, {
                detail: mjsAttemptDetail("mjs 执行失败", attempt),
                ...MJS_PROGRESS_OPTS,
              });
              lastFailure = { kind: "node", errors: runIssues, rawContent: rawMjs };
              logStepDone(LOG_TAG, `  mjs 执行失败（尝试 ${attempt}）`, tNode);
              if (attempt >= MAX_MJS_ATTEMPTS) {
                throw new LlmStageFailure(
                  feedbackFromLlmAttempt(mjsSource, null, "mjs 执行失败", runIssues)
                );
              }
              continue;
            }

            const tValidate = stepStart();
            if (!genRun.ok) {
              validateStep.failAttempt(attempt, {
                detail: mjsAttemptDetail("validate 未通过", attempt),
                ...MJS_PROGRESS_OPTS,
              });
              lastFailure = { kind: "validate", errors: runIssues, rawContent: rawMjs };
              logStepDone(LOG_TAG, `  validate 未通过（尝试 ${attempt}）`, tValidate);
              if (attempt >= MAX_MJS_ATTEMPTS) {
                throw new LlmStageFailure(
                  feedbackFromLlmAttempt(
                    mjsSource,
                    null,
                    "validate 未通过",
                    runIssues.slice(0, 25)
                  )
                );
              }
              continue;
            }
            logStepDone(LOG_TAG, `  validate 通过（尝试 ${attempt}）`, tValidate);
            generateStep.succeed();
            validateStep.succeed();
            mjsStdout = genRun.mjsStdout;
            attemptOk = true;
            break;
          } finally {
            logStepDone(
              LOG_TAG,
              `尝试 ${attempt} ${attemptOk ? "成功" : "结束（将重试或失败）"}`,
              tAttempt
            );
          }
        }

        if (!mjsSource) {
          throw new Error("MR:MjsGenerate 未产出 mjs");
        }

        logStepDone(LOG_TAG, "MR:MjsGenerate 阶段完成", tMjsGenerate);

        const resolvedEmail = parseEmailKeyFromMjs(mjsSource) ?? emailKey;
        const outputDir =
          persistMode === "layout-only"
            ? stagingDir!
            : path.join(REPO_ROOT, "data/emails", resolvedEmail, "layouts/default");

        fs.writeFileSync(
          path.join(logDir, "03-validation.json"),
          `${JSON.stringify({ ok: true, issues: [] }, null, 2)}\n`
        );

        return {
          emailKey: resolvedEmail,
          mjsPath,
          outputDir,
          mjsStdout,
          validationOk: true,
          validationIssues: [],
          logDir,
        };
      }
    );
  } catch (e) {
    throw e;
  }
}
