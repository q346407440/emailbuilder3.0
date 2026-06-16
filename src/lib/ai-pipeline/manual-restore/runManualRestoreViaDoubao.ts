import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createDoubaoRawClient } from "../adapters/doubaoClient";
import { llmExchangeContextStore } from "../llmCallContext";
import { wrapLlmClientWithQueue } from "../llmRequestQueue";
import { appendRetryToUserText, feedbackFromLlmAttempt, LlmStageFailure } from "../llmRetryFeedback";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import { isTransientLlmError } from "../llmTransientError";
import { parseLlmJson } from "../parseLlmJson";
import {
  createNoopPipelineProgressReporter,
  type PipelineProgressReporter,
} from "../ports/PipelineProgressReporter";
import { MANUAL_RESTORE_MJS_UI_STEPS_INITIAL, MANUAL_RESTORE_MJS_MAX_ATTEMPTS, formatManualRestoreAttemptLabel } from "../../../layout-variant-ai-contract/progress";
import { buildMjsDeltaSystemPrompt, buildMjsDeltaUserText } from "./promptsMjsDelta";
import {
  buildMjsPatchSystemPrompt,
  buildMjsPatchUserText,
  type MjsSlotRepairGroup,
} from "./promptsMjsEdit";
import { buildVisualBlueprintSystemPrompt, buildVisualBlueprintUserText } from "./promptsVisualBlueprint";
import { buildMotherMjsBody } from "./mjsMotherBody";
import { assertMjsComplete, parseEmailKeyFromMjs } from "./extractMjsFromLlm";
import type { InjectedMjsAssets } from "./injectedMjsAssets";
import { formatInjectedAssetsForMjs } from "./injectedMjsAssets";
import { assembleMjsFromBody, deriveMjsIdPrefix, type MjsScaffoldContext } from "./mjsScaffold";
import {
  assertNoHallucinatedAssetUrls,
  resolveMjsAssetsFromDesign,
} from "./resolveMjsAssetsFromDesign";
import { deriveDesignCopyPath } from "./manualRestorePaths";
import {
  ManualRestoreBlueprintSchema,
  type ManualRestoreBlueprint,
  type ManualRestorePersistMode,
  type ManualRestoreRunInput,
  type ManualRestoreRunResult,
} from "./types";
import { normalizeBlueprintFromLlm } from "./normalizeBlueprintFromLlm";
import { logStepDone, stepStart } from "./stepTiming";
import { createMjsRunTiming, type MjsRunTimingRecordOpts } from "./mjsRunTiming";
import { applyMjsAutofix } from "./mjsAutofix";
import { literalizeMjsThemeRefs } from "./mjsLiteralize";
import { applyMjsPatches, isMjsPatchMergeClean, parseMjsPatchesFromLlm } from "./mjsPatchApply";
import { injectedAssetKeySets, screenPatchesForUnknownAssetKeys } from "./mjsAssetKeyGuard";
import { groupValidateIssuesBySlot } from "./mjsErrorSlotMap";
import { extractMjsSlotContent } from "../../../mjs-patch-contract";
import { runMjsAndValidate, tokenFallbacksFromBlueprint } from "./mjsRunValidate";
import { formatVisualLintIssues, lintManualRestoreTemplateFile } from "./mjsVisualLint";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const LOG_TAG = "[manual-restore:mjs]";
/** 底稿 patch 首轮包含看图与 slot 生成，复杂模板偶发 >5min。 */
const MJS_GENERATE_TIMEOUT_MS = 420_000;
/** patch 修复可能整段重生成多个 slot（与整稿同量级输出），180s 实测会被掐断。 */
const MJS_PATCH_TIMEOUT_MS = 300_000;
const VISUAL_BLUEPRINT_TIMEOUT_MS = 180_000;
/** 底稿 patch 只输出 XML slot patch，不应按整段 body 放大输出预算。 */
const MJS_DELTA_MAX_TOKENS = 16_384;
const MJS_PATCH_MAX_TOKENS = 16_384;
/** visual blueprint 只做轻量规格提取，避免输出半份模板 IR。 */
const VISUAL_BLUEPRINT_MAX_TOKENS = 4_096;
/** 首次底稿 patch + 最多 2 次重试。 */
const MAX_MJS_ATTEMPTS = MANUAL_RESTORE_MJS_MAX_ATTEMPTS;

const MJS_PROGRESS_OPTS = { maxAttempts: MAX_MJS_ATTEMPTS } as const;

function mjsAttemptDetail(message: string, attempt: number): string {
  return `${message}（${formatManualRestoreAttemptLabel(attempt, MAX_MJS_ATTEMPTS)}）`;
}

type FailureKind = "validate" | "visual" | "node" | "generate" | "patch";

type AttemptFailure = {
  kind: FailureKind;
  errors: string[];
  rawContent?: string;
  /**
   * 本轮被资产键守卫拒绝的补丁原因（含合法键清单）。
   * 须随失败跨 attempt 透传进下一轮修复 prompt——否则模型看不到拒绝原因会原样重犯
   * （2026-06-12 模板 38 实证：同一批编造 ICON 键连续两轮被拒）。
   */
  guardRejections?: string[];
};

/**
 * 单次 attempt 步骤函数的结果：成功（产出 mjs + stdout）/ 需重试（携带最新源码与失败原因）/
 * 保底交付（最终尝试 validate 或视觉门未全过，但 staging 产物可用且与 mjs 同步——交付并附问题清单，不空手而归）。
 * 仅 node 执行失败等「无可用产物」场景才 throw。
 */
type AttemptOutcome =
  | { kind: "success"; mjsSource: string; mjsStdout: string }
  | { kind: "retry"; mjsSource: string; lastFailure: AttemptFailure }
  | { kind: "degraded"; mjsSource: string; mjsStdout: string; issues: string[] };

function isPatchRetryKind(kind: FailureKind | undefined): boolean {
  return kind === "validate" || kind === "visual" || kind === "node" || kind === "patch";
}

function canUsePatchRetryPath(
  attempt: number,
  lastFailure: AttemptFailure | null,
  mjsSource: string
): boolean {
  return attempt > 1 && mjsSource.length > 0 && isPatchRetryKind(lastFailure?.kind);
}

/** 两次失败的错误集合是否完全相同（顺序无关）——相同说明该修复路径已不收敛。 */
function sameFailureErrorSet(a: AttemptFailure | null, b: AttemptFailure): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.errors.length !== b.errors.length) return false;
  const sortedA = [...a.errors].sort();
  const sortedB = [...b.errors].sort();
  return sortedA.every((line, i) => line === sortedB[i]);
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

/** validate 未通过时先跑一轮 reactive autofix 并重试，避免无谓进入豆包 patch。 */
function tryReactiveAutofixBeforeRetry(
  mjsSource: string,
  issues: string[]
): { source: string; changed: boolean; fixes: string[] } {
  const autofix = applyMjsAutofix(mjsSource, issues);
  if (!autofix.changed) {
    return { source: mjsSource, changed: false, fixes: [] };
  }
  return {
    source: finalizeMjsSource(autofix.source, issues),
    changed: true,
    fixes: autofix.fixes,
  };
}

/** validate 失败时落盘具体错误，便于对照 patch 输入。 */
function writeValidateErrorLog(logDir: string, attempt: number, issues: string[]): void {
  fs.writeFileSync(
    path.join(logDir, `03-validate-errors-attempt-${attempt}.json`),
    `${JSON.stringify({ ok: false, count: issues.length, issues: issues.slice(0, 50) }, null, 2)}\n`
  );
}

type MjsPostProcessResult =
  | { ok: true; source: string; errors: [] }
  | { ok: false; source: string; errors: string[] }
  | { ok: false; source: ""; errors: string[] };

function finalizeAssembledMjs(
  body: string,
  injectedAssets: InjectedMjsAssets,
  scaffold: MjsScaffoldContext
): MjsPostProcessResult {
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

/** 底稿 merge 后拼接 mjs（跳过 LLM body 提取）。 */
function tryPostProcessMjsFromBody(
  body: string,
  injectedAssets: InjectedMjsAssets,
  scaffold: MjsScaffoldContext
): MjsPostProcessResult {
  return finalizeAssembledMjs(body.trim(), injectedAssets, scaffold);
}

function mergeRunIssues(post: MjsPostProcessResult, runIssues: string[]): string[] {
  const head = post.ok ? [] : post.errors;
  const tail = runIssues.filter((line) => !head.includes(line));
  return [...head, ...tail];
}

/**
 * visual lint 分级：error 级阻断流程；warning 级仅在有预算时驱动 patch 改进。
 * accept=true 表示本轮可交付（无 error，且无 warning 或已到最终一轮）。
 */
type VisualGateResult = {
  blocking: string[];
  warnings: string[];
  accept: boolean;
};

function visualLintIssuesForRun(
  templatePath: string,
  blueprint: ManualRestoreBlueprint
): { blocking: string[]; warnings: string[] } {
  if (!templatePath || !fs.existsSync(templatePath)) return { blocking: [], warnings: [] };
  const issues = lintManualRestoreTemplateFile(templatePath, blueprint);
  return {
    blocking: formatVisualLintIssues(issues.filter((item) => item.severity === "error")),
    warnings: formatVisualLintIssues(issues.filter((item) => item.severity === "warning")),
  };
}

/** 最终一轮只要无 error 即可交付（保留 warning 提示）；中途任何问题都驱动改进。 */
function isVisualGateAcceptable(
  blocking: string[],
  warnings: string[],
  attempt: number
): boolean {
  if (blocking.length > 0) return false;
  return warnings.length === 0 || attempt >= MAX_MJS_ATTEMPTS;
}

function visualGateErrors(gate: VisualGateResult): string[] {
  return [...gate.blocking, ...gate.warnings];
}

type MjsStepProgress = ReturnType<PipelineProgressReporter["forStep"]>;
type MjsLlmClient = ReturnType<typeof wrapLlmClientWithQueue>;

/**
 * 单次 mjs attempt 步骤函数的显式依赖（run 作用域内一次性构造，跨 attempt 不变）。
 * 把原本由闭包隐式捕获的 IO / 进度 / LLM 客户端收敛为显式入参，便于复用与隔离。
 */
type MjsAttemptContext = {
  imageDataUrl: string;
  logDir: string;
  mjsPath: string;
  mjsScaffold: MjsScaffoldContext;
  injectedAssets: InjectedMjsAssets;
  visualBlueprint: ManualRestoreBlueprint;
  deltaLlm: MjsLlmClient;
  patchLlm: MjsLlmClient;
  generateStep: MjsStepProgress;
  validateStep: MjsStepProgress;
  stepDone: (
    label: string,
    startMs: number,
    detail?: string,
    timingOpts?: MjsRunTimingRecordOpts
  ) => void;
  runValidate: (source: string) => ReturnType<typeof runMjsAndValidate>;
  runVisualLintGate: (
    templatePath: string,
    attempt: number,
    label: string,
    blueprint: ManualRestoreBlueprint
  ) => VisualGateResult;
};

/** JSON 层确定性 autofix 生效时记录步骤（机械契约问题已在落盘产物上按路径修复）。 */
function logJsonAutofixes(
  ctx: MjsAttemptContext,
  run: ReturnType<typeof runMjsAndValidate>,
  attempt: number
): void {
  if (run.jsonAutofixes.length === 0) return;
  ctx.stepDone(
    `  JSON 层 autofix ${run.jsonAutofixes.length} 处（尝试 ${attempt}）`,
    stepStart(),
    run.jsonAutofixes.slice(0, 6).join(" · "),
    { stepId: "MR:MjsGenerate", attempt }
  );
}

/**
 * patch 修复分支：autofix → validate → 视觉门 → 豆包 patch → apply → validate → 视觉门。
 * 仅在已有可执行 mjs 且上轮失败可 patch 时调用（见 canUsePatchRetryPath）。
 */
async function runPatchRepairAttempt(
  ctx: MjsAttemptContext,
  attempt: number,
  baseSource: string,
  incoming: AttemptFailure
): Promise<AttemptOutcome> {
  let mjsSource = baseSource;
  let lastFailure: AttemptFailure = incoming;
  const tAutofix = stepStart();
  console.log(`${LOG_TAG}   程序 autofix（尝试 ${attempt}）…`);
  ctx.generateStep.logDetail(mjsAttemptDetail("程序 autofix", attempt), {
    attempt,
    ...MJS_PROGRESS_OPTS,
  });
  let patchErrors: string[] = lastFailure.errors;
  const beforeAutofix = mjsSource;
  const autofix = applyMjsAutofix(mjsSource, lastFailure.errors);
  mjsSource = finalizeMjsSource(autofix.source, lastFailure.errors);
  const autofixApplied = mjsSource !== beforeAutofix;

  if (autofixApplied || autofix.fixes.length > 0) {
    fs.writeFileSync(path.join(ctx.logDir, `03-autofix-attempt-${attempt}.mjs`), mjsSource);
    ctx.stepDone(
      `  程序 autofix 完成（尝试 ${attempt}）`,
      tAutofix,
      autofix.fixes.join(" · "),
      { stepId: "MR:MjsGenerate", attempt }
    );

    const tNodeAutofix = stepStart();
    const autofixRun = ctx.runValidate(mjsSource);
    logJsonAutofixes(ctx, autofixRun, attempt);
    fs.writeFileSync(
      path.join(ctx.logDir, `02-mjs-run-attempt-${attempt}-autofix.log`),
      autofixRun.mjsStdout
    );
    ctx.stepDone( `  node+validate（autofix 后，尝试 ${attempt}）`, tNodeAutofix);

    if (autofixRun.ok) {
      ctx.validateStep.start(attempt, {
        detail: mjsAttemptDetail("node 执行 mjs（autofix 后）", attempt),
        ...MJS_PROGRESS_OPTS,
      });
      ctx.validateStep.succeed();
      const visualGate = ctx.runVisualLintGate(
        autofixRun.templatePath,
        attempt,
        "检查视觉质量门（autofix 后）",
        ctx.visualBlueprint
      );
      if (visualGate.accept) {
        ctx.generateStep.succeed();
        return { kind: "success", mjsSource, mjsStdout: autofixRun.mjsStdout };
      }
      patchErrors = visualGateErrors(visualGate);
      lastFailure = { kind: "visual", errors: patchErrors, rawContent: mjsSource };
      ctx.generateStep.logDetail(
        mjsAttemptDetail(
          visualGate.blocking.length > 0
            ? `visual lint 未通过（error ${visualGate.blocking.length} / warning ${visualGate.warnings.length}），继续 patch`
            : `视觉质量润色（${visualGate.warnings.length} 条提示），继续 patch`,
          attempt
        ),
        { attempt, ...MJS_PROGRESS_OPTS }
      );
    } else {
      patchErrors = autofixRun.allIssues;
      lastFailure = {
        kind: autofixRun.nodeFailed ? "node" : "validate",
        errors: autofixRun.allIssues,
        rawContent: mjsSource,
      };
      if (!autofixRun.nodeFailed) {
        writeValidateErrorLog(ctx.logDir, attempt, autofixRun.allIssues);
      }
      ctx.generateStep.logDetail(
        mjsAttemptDetail(
          `autofix 后 validate 仍失败（${autofixRun.allIssues.length} 条），继续 patch`,
          attempt
        ),
        { attempt, ...MJS_PROGRESS_OPTS }
      );
    }
  } else {
    ctx.stepDone( `  程序 autofix 无改动（尝试 ${attempt}）`, tAutofix);
  }

  const tPatchLlm = stepStart();
  console.log(`${LOG_TAG}   豆包 MR:MjsPatch API（尝试 ${attempt}）…`);
  ctx.generateStep.logDetail(mjsAttemptDetail("豆包 MR:MjsPatch API", attempt), {
    attempt,
    ...MJS_PROGRESS_OPTS,
  });
  // patch 始终基于 autofix 后的 mjsSource（非上一轮原始稿）；
  // 修复粒度 = slot 整段重生成（锚点定位与内容无关，不存在 search 未命中一类故障）
  const grouped = groupValidateIssuesBySlot(patchErrors, ctx.mjsScaffold.idPrefix);
  const slotGroups: MjsSlotRepairGroup[] = [];
  const unmapped = [...grouped.unmapped];
  for (const group of grouped.groups) {
    const currentSource = extractMjsSlotContent(mjsSource, group.slotId);
    if (currentSource == null) {
      // slot 锚点已被破坏 → 该组错误降级为 search 兜底（附完整脚本）
      unmapped.push(...group.errors);
      continue;
    }
    slotGroups.push({ slotId: group.slotId, errors: group.errors, currentSource });
  }
  const promptMode = unmapped.length > 0 ? "both" : "slot";
  const keySets = injectedAssetKeySets(ctx.injectedAssets);
  const assetKeyGuide = `ICON{${[...keySets.ICON].join(",")}} PEXELS{${[...keySets.PEXELS].join(",")}}`;
  const rawPatch = await ctx.patchLlm.complete([
    { role: "system", content: buildMjsPatchSystemPrompt(ctx.visualBlueprint, promptMode, assetKeyGuide) },
    {
      role: "user",
      content: buildMjsPatchUserText({
        errorLines: patchErrors,
        slotGroups,
        unmapped,
        fullSource: unmapped.length > 0 ? mjsSource : undefined,
        guardRejections: incoming.guardRejections,
      }),
    },
  ]);
  ctx.stepDone( `  豆包 Patch API 返回（尝试 ${attempt}）`, tPatchLlm);
  fs.writeFileSync(path.join(ctx.logDir, `04-patch-raw-attempt-${attempt}.txt`), rawPatch);

  const tApply = stepStart();
  const parsedPatches = parseMjsPatchesFromLlm(rawPatch);
  // 资产键守卫：引用注入表不存在的 ICON/PEXELS 键的补丁整体拒绝（防止空 src 静默回归）
  const screened = screenPatchesForUnknownAssetKeys(parsedPatches, ctx.injectedAssets);
  // 本轮有拒绝时随失败透传，下一轮修复 prompt 须看到拒绝原因与合法键清单
  const guardRejections = screened.rejections.length > 0 ? screened.rejections : undefined;
  if (screened.rejections.length > 0) {
    ctx.stepDone(
      `  资产键守卫拒绝 ${screened.rejections.length} 条补丁（尝试 ${attempt}）`,
      tApply,
      screened.rejections.slice(0, 2).join("; "),
      { stepId: "MR:MjsGenerate", attempt }
    );
  }
  const patches = screened.accepted;
  const applied = applyMjsPatches(mjsSource, patches);
  if (patches.length === 0 || !isMjsPatchMergeClean(applied, patches.length)) {
    const mergeIssue =
      patches.length === 0
        ? "补丁全部被资产键守卫拒绝"
        : applied.hasPatchArtifacts
          ? "merge 后残留 patch 标记"
          : applied.applied === 0
            ? "补丁未命中任何 SEARCH 块"
            : `补丁未全部命中（${applied.applied}/${patches.length}）`;
    ctx.stepDone(
      `  ${mergeIssue}，继续 patch 修复（尝试 ${attempt}）`,
      tApply,
      [...applied.failures, mergeIssue].slice(0, 3).join("; "),
      { stepId: "MR:MjsGenerate", attempt }
    );
    ctx.generateStep.failAttempt(attempt, {
      detail: mjsAttemptDetail(`${mergeIssue}，继续 patch 修复`, attempt),
      ...MJS_PROGRESS_OPTS,
    });
    lastFailure = {
      kind: "patch",
      errors: [mergeIssue, ...screened.rejections, ...applied.failures, ...lastFailure.errors.slice(0, 10)],
      rawContent: rawPatch,
      guardRejections,
    };
    if (attempt >= MAX_MJS_ATTEMPTS) {
      // staging 产物来自本轮 patch 前的最后一次 node 运行，与当前 mjsSource 同步 → 保底交付
      return {
        kind: "degraded",
        mjsSource,
        mjsStdout: "",
        issues: [mergeIssue, ...patchErrors],
      };
    }
    return { kind: "retry", mjsSource, lastFailure };
  }
  mjsSource = finalizeMjsSource(applied.source);
  ctx.stepDone(
    `  应用补丁 ${applied.applied} 处（尝试 ${attempt}）`,
    tApply,
    applied.failures.length > 0 ? applied.failures.join("; ") : undefined,
    { stepId: "MR:MjsGenerate", attempt }
  );
  fs.writeFileSync(path.join(ctx.logDir, `05-patched-attempt-${attempt}.mjs`), mjsSource);
  ctx.generateStep.succeed();

  ctx.validateStep.start(attempt, {
    detail: mjsAttemptDetail("node 执行 mjs（patch 后）", attempt),
    ...MJS_PROGRESS_OPTS,
  });
  const tNode = stepStart();
  console.log(`${LOG_TAG}   node 执行 mjs（patch 后，尝试 ${attempt}）…`);
  const patchRun = ctx.runValidate(mjsSource);
  logJsonAutofixes(ctx, patchRun, attempt);
  fs.writeFileSync(
    path.join(ctx.logDir, `02-mjs-run-attempt-${attempt}.log`),
    patchRun.mjsStdout
  );
  ctx.stepDone( `  node 执行完成（patch 后，尝试 ${attempt}）`, tNode);

  if (!patchRun.ok && patchRun.nodeFailed) {
    ctx.validateStep.failAttempt(attempt, {
      detail: mjsAttemptDetail("patch 后 mjs 执行失败", attempt),
      ...MJS_PROGRESS_OPTS,
    });
    lastFailure = { kind: "node", errors: patchRun.allIssues, rawContent: mjsSource, guardRejections };
    ctx.stepDone(`  mjs 执行失败（patch 后，尝试 ${attempt}）`, tNode, undefined, {
      stepId: "MR:RunValidate",
      attempt,
    });
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
    return { kind: "retry", mjsSource, lastFailure };
  }

  const tValidate = stepStart();
  if (!patchRun.ok) {
    ctx.validateStep.failAttempt(attempt, {
      detail: mjsAttemptDetail("validate 未通过（patch 后）", attempt),
      ...MJS_PROGRESS_OPTS,
    });
    lastFailure = { kind: "validate", errors: patchRun.allIssues, guardRejections };
    writeValidateErrorLog(ctx.logDir, attempt, patchRun.allIssues);
    ctx.stepDone(`  validate 未通过（patch 后，尝试 ${attempt}）`, tValidate, undefined, {
      stepId: "MR:RunValidate",
      attempt,
    });
    if (attempt >= MAX_MJS_ATTEMPTS) {
      return {
        kind: "degraded",
        mjsSource,
        mjsStdout: patchRun.mjsStdout,
        issues: patchRun.allIssues,
      };
    }
    return { kind: "retry", mjsSource, lastFailure };
  }
  ctx.stepDone( `  validate 通过（patch 后，尝试 ${attempt}）`, tValidate);
  ctx.validateStep.succeed();
  const patchVisualGate = ctx.runVisualLintGate(
    patchRun.templatePath,
    attempt,
    "检查视觉质量门（patch 后）",
    ctx.visualBlueprint
  );
  if (!patchVisualGate.accept) {
    lastFailure = {
      kind: "visual",
      errors: visualGateErrors(patchVisualGate),
      rawContent: mjsSource,
      guardRejections,
    };
    if (attempt >= MAX_MJS_ATTEMPTS) {
      return {
        kind: "degraded",
        mjsSource,
        mjsStdout: patchRun.mjsStdout,
        issues: patchVisualGate.blocking,
      };
    }
    return { kind: "retry", mjsSource, lastFailure };
  }
  ctx.generateStep.succeed();
  return { kind: "success", mjsSource, mjsStdout: patchRun.mjsStdout };
}

/**
 * 生成分支：底稿+patch → 后处理 → proactive/reactive autofix → validate → 视觉门。
 */
async function runGenerateAttempt(
  ctx: MjsAttemptContext,
  attempt: number,
  baseSource: string,
  incoming: AttemptFailure | null
): Promise<AttemptOutcome> {
  let mjsSource = baseSource;
  let lastFailure: AttemptFailure | null = incoming;
  let rawMjs = "";
  let post: MjsPostProcessResult | null = null;

  if (attempt === 1) {
    const motherBody = buildMotherMjsBody();
    fs.writeFileSync(path.join(ctx.logDir, "01-mother-body.mjs"), motherBody);

    // 一次性整稿生成：单次调用产出全部 slot patch（不按 slot 分发并行）
    const tDeltaLlm = stepStart();
    console.log(`${LOG_TAG}   豆包 MR:MjsGenerate API（尝试 1 · 底稿+patch）…`);
    ctx.generateStep.logDetail(mjsAttemptDetail("豆包整稿生成（底稿+patch）", attempt), {
      attempt,
      ...MJS_PROGRESS_OPTS,
    });
    const rawDelta = await ctx.deltaLlm.complete([
      { role: "system", content: buildMjsDeltaSystemPrompt(ctx.injectedAssets, ctx.visualBlueprint) },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: ctx.imageDataUrl } },
          {
            type: "text",
            text: buildMjsDeltaUserText({
              idPrefix: ctx.mjsScaffold.idPrefix,
              motherBody,
            }),
          },
        ],
      },
    ]);
    ctx.stepDone("  豆包 API 返回（底稿+patch）", tDeltaLlm, undefined, {
      stepId: "MR:MjsGenerate",
      attempt,
    });
    const deltaPatches = parseMjsPatchesFromLlm(rawDelta);
    fs.writeFileSync(path.join(ctx.logDir, `01-llm-delta-attempt-${attempt}.txt`), rawDelta);

    const tApplyDelta = stepStart();
    const deltaApplied = applyMjsPatches(motherBody, deltaPatches);
    fs.writeFileSync(
      path.join(ctx.logDir, `01-delta-merged-attempt-${attempt}.mjs`),
      deltaApplied.source
    );

    if (isMjsPatchMergeClean(deltaApplied, deltaPatches.length)) {
      rawMjs = rawDelta;
      post = tryPostProcessMjsFromBody(deltaApplied.source, ctx.injectedAssets, ctx.mjsScaffold);
      ctx.stepDone(
        `  底稿 merge ${deltaApplied.applied} 处补丁（尝试 ${attempt}）`,
        tApplyDelta,
        undefined,
        { stepId: "MR:MjsGenerate", attempt }
      );
    } else {
      const mergeIssue = deltaApplied.hasPatchArtifacts
        ? "merge 后残留 patch 标记"
        : deltaApplied.applied === 0
          ? "patch 未命中"
          : `patch 未全部命中（${deltaApplied.applied}/${deltaPatches.length}）`;
      ctx.stepDone(
        `  底稿 ${mergeIssue}，继续 patch 修复（尝试 ${attempt}）`,
        tApplyDelta,
        [...deltaApplied.failures, mergeIssue].slice(0, 3).join("; "),
        { stepId: "MR:MjsGenerate", attempt }
      );
      ctx.generateStep.logDetail(
        mjsAttemptDetail(`底稿 ${mergeIssue}，继续 patch 修复`, attempt),
        { attempt, ...MJS_PROGRESS_OPTS }
      );
      const partialPost = tryPostProcessMjsFromBody(
        deltaApplied.source,
        ctx.injectedAssets,
        ctx.mjsScaffold
      );
      mjsSource = partialPost.source;
      lastFailure = {
        kind: "patch",
        errors: [mergeIssue, ...deltaApplied.failures, ...partialPost.errors],
        rawContent: rawDelta,
      };
      if (attempt >= MAX_MJS_ATTEMPTS) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt(rawDelta, null, mergeIssue, deltaApplied.failures)
        );
      }
      return { kind: "retry", mjsSource, lastFailure: lastFailure! };
    }
  }

  if (!post) {
    throw new LlmStageFailure(
      feedbackFromLlmAttempt(
        mjsSource,
        null,
        "底稿 patch 未产出可执行 mjs",
        lastFailure?.errors ?? []
      )
    );
  }

  const tPost = stepStart();
  if (!post.ok && post.source === "") {
    ctx.stepDone( `  程序处理 mjs 失败（尝试 ${attempt}）`, tPost);
    const detail = mjsAttemptDetail("程序处理 mjs 失败", attempt);
    ctx.generateStep.failAttempt(attempt, { detail, ...MJS_PROGRESS_OPTS });
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
    return { kind: "retry", mjsSource, lastFailure: lastFailure! };
  }

  mjsSource = post.source;
  if (post.ok) {
    const tProactiveAutofix = stepStart();
    const proactive = applyMjsAutofix(mjsSource, []);
    if (proactive.changed) {
      mjsSource = finalizeMjsSource(proactive.source, []);
      fs.writeFileSync(
        path.join(ctx.logDir, `03-autofix-proactive-attempt-${attempt}.mjs`),
        mjsSource
      );
      ctx.stepDone(
        `  程序 proactive autofix（尝试 ${attempt}）`,
        tProactiveAutofix,
        proactive.fixes.join(" · "),
        { stepId: "MR:MjsGenerate", attempt }
      );
    } else {
      ctx.stepDone(`  程序 proactive autofix 无改动（尝试 ${attempt}）`, tProactiveAutofix);
    }
    ctx.stepDone( `  程序处理并写入 mjs（尝试 ${attempt}）`, tPost, ctx.mjsPath);
    ctx.generateStep.succeed();
  } else {
    ctx.stepDone(
      `  程序处理 mjs 失败（尝试 ${attempt}）`,
      tPost,
      post.errors.join(" · "),
      { stepId: "MR:MjsGenerate", attempt }
    );
    fs.writeFileSync(path.join(ctx.logDir, `01-postprocess-warn-attempt-${attempt}.txt`), post.errors.join("\n"));
    const detail = mjsAttemptDetail(
      `程序处理 mjs 失败（${post.errors[0] ?? "完整性校验未通过"}）`,
      attempt
    );
    ctx.generateStep.failAttempt(attempt, { detail, ...MJS_PROGRESS_OPTS });
    lastFailure = { kind: "node", errors: post.errors, rawContent: rawMjs };
    if (attempt >= MAX_MJS_ATTEMPTS) {
      throw new LlmStageFailure(
        feedbackFromLlmAttempt(mjsSource, null, post.errors[0] ?? "mjs 执行失败", post.errors)
      );
    }
    return { kind: "retry", mjsSource, lastFailure };
  }

  ctx.validateStep.start(attempt, {
    detail: mjsAttemptDetail("node 执行 mjs", attempt),
    ...MJS_PROGRESS_OPTS,
  });
  const tNode = stepStart();
  console.log(`${LOG_TAG}   node 执行 mjs（尝试 ${attempt}）…`);
  const genRun = ctx.runValidate(mjsSource);
  logJsonAutofixes(ctx, genRun, attempt);
  fs.writeFileSync(path.join(ctx.logDir, `02-mjs-run-attempt-${attempt}.log`), genRun.mjsStdout);
  ctx.stepDone( `  node 执行完成（尝试 ${attempt}）`, tNode);

  const runIssues = mergeRunIssues(post, genRun.allIssues);

  if (genRun.nodeFailed && !genRun.ok) {
    ctx.validateStep.failAttempt(attempt, {
      detail: mjsAttemptDetail("mjs 执行失败", attempt),
      ...MJS_PROGRESS_OPTS,
    });
    lastFailure = { kind: "node", errors: runIssues, rawContent: rawMjs };
    ctx.stepDone( `  mjs 执行失败（尝试 ${attempt}）`, tNode);
    if (attempt >= MAX_MJS_ATTEMPTS) {
      throw new LlmStageFailure(
        feedbackFromLlmAttempt(mjsSource, null, "mjs 执行失败", runIssues)
      );
    }
    return { kind: "retry", mjsSource, lastFailure };
  }

  const tValidate = stepStart();
  if (!genRun.ok) {
    const tReactiveAutofix = stepStart();
    const reactive = tryReactiveAutofixBeforeRetry(mjsSource, runIssues);
    mjsSource = reactive.source;
    if (reactive.changed) {
      fs.writeFileSync(
        path.join(ctx.logDir, `03-autofix-reactive-attempt-${attempt}.mjs`),
        reactive.source
      );
      ctx.stepDone(
        `  程序 reactive autofix（尝试 ${attempt}）`,
        tReactiveAutofix,
        reactive.fixes.join(" · "),
        { stepId: "MR:MjsGenerate", attempt }
      );
      const retryRun = ctx.runValidate(mjsSource);
      logJsonAutofixes(ctx, retryRun, attempt);
      fs.writeFileSync(
        path.join(ctx.logDir, `02-mjs-run-attempt-${attempt}-autofix.log`),
        retryRun.mjsStdout
      );
      if (retryRun.ok) {
        ctx.stepDone(`  validate 通过（reactive autofix 后，尝试 ${attempt}）`, tValidate);
        ctx.validateStep.succeed();
        const retryVisualGate = ctx.runVisualLintGate(
          retryRun.templatePath,
          attempt,
          "检查视觉质量门（reactive autofix 后）",
          ctx.visualBlueprint
        );
        if (!retryVisualGate.accept) {
          lastFailure = {
            kind: "visual",
            errors: visualGateErrors(retryVisualGate),
            rawContent: mjsSource,
          };
          if (attempt >= MAX_MJS_ATTEMPTS) {
            return {
              kind: "degraded",
              mjsSource,
              mjsStdout: retryRun.mjsStdout,
              issues: retryVisualGate.blocking,
            };
          }
          return { kind: "retry", mjsSource, lastFailure };
        }
        ctx.generateStep.succeed();
        return { kind: "success", mjsSource, mjsStdout: retryRun.mjsStdout };
      }
      runIssues.splice(0, runIssues.length, ...mergeRunIssues(post, retryRun.allIssues));
    } else {
      ctx.stepDone(`  程序 reactive autofix 无改动（尝试 ${attempt}）`, tReactiveAutofix);
    }

    ctx.validateStep.failAttempt(attempt, {
      detail: mjsAttemptDetail("validate 未通过", attempt),
      ...MJS_PROGRESS_OPTS,
    });
    lastFailure = { kind: "validate", errors: runIssues, rawContent: rawMjs };
    writeValidateErrorLog(ctx.logDir, attempt, runIssues);
    ctx.stepDone( `  validate 未通过（尝试 ${attempt}）`, tValidate);
    if (attempt >= MAX_MJS_ATTEMPTS) {
      return { kind: "degraded", mjsSource, mjsStdout: genRun.mjsStdout, issues: runIssues };
    }
    return { kind: "retry", mjsSource, lastFailure };
  }
  ctx.stepDone( `  validate 通过（尝试 ${attempt}）`, tValidate);
  ctx.validateStep.succeed();
  const genVisualGate = ctx.runVisualLintGate(
    genRun.templatePath,
    attempt,
    "检查视觉质量门",
    ctx.visualBlueprint
  );
  if (!genVisualGate.accept) {
    lastFailure = {
      kind: "visual",
      errors: visualGateErrors(genVisualGate),
      rawContent: mjsSource,
    };
    if (attempt >= MAX_MJS_ATTEMPTS) {
      return { kind: "degraded", mjsSource, mjsStdout: genRun.mjsStdout, issues: genVisualGate.blocking };
    }
    return { kind: "retry", mjsSource, lastFailure };
  }
  ctx.generateStep.succeed();
  return { kind: "success", mjsSource, mjsStdout: genRun.mjsStdout };
}

async function createVisualBlueprint(opts: {
  llm: ReturnType<typeof wrapLlmClientWithQueue>;
  imageDataUrl: string;
  emailKey: string;
  displayName: string;
  idPrefix: string;
  progress: PipelineProgressReporter;
  logDir: string;
  recordStep: (label: string, startMs: number, detail?: string, timingOpts?: MjsRunTimingRecordOpts) => void;
}): Promise<ManualRestoreBlueprint> {
  const step = opts.progress.forStep("MR:VisualBlueprint");
  step.start(1, { detail: "豆包 MR:VisualBlueprint API" });
  const started = stepStart();
  try {
    const blueprint = await callLlmStageWithRetry(
      { stage: "MR:VisualBlueprint", stepProgress: step, timeoutMs: VISUAL_BLUEPRINT_TIMEOUT_MS },
      async ({ feedback }) => {
        const raw = await opts.llm.complete([
          { role: "system", content: buildVisualBlueprintSystemPrompt() },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: opts.imageDataUrl } },
              {
                type: "text",
                text: appendRetryToUserText(
                  buildVisualBlueprintUserText({
                    emailKey: opts.emailKey,
                    displayName: opts.displayName,
                    idPrefix: opts.idPrefix,
                  }),
                  feedback
                ),
              },
            ],
          },
        ]);
        fs.writeFileSync(path.join(opts.logDir, "00-visual-blueprint-raw.txt"), raw);
        let parsed: unknown;
        try {
          parsed = parseLlmJson(raw);
        } catch (e) {
          throw new LlmStageFailure(
            feedbackFromLlmAttempt(
              raw,
              null,
              e instanceof Error ? e.message : "visual blueprint JSON 解析失败"
            )
          );
        }
        // emailKey/displayName/idPrefix 为程序已知：prompt 已禁止模型回显，
        // 此处统一注入/覆盖（模型即使输出了也以程序值为准）
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsed = {
            ...(parsed as Record<string, unknown>),
            emailKey: opts.emailKey,
            displayName: opts.displayName,
            idPrefix: opts.idPrefix,
          };
        }
        try {
          // 先做契约归一化（px 形态、容器间距上限 clamp），越界识别值不得流入生成 prompt
          return ManualRestoreBlueprintSchema.parse(normalizeBlueprintFromLlm(parsed));
        } catch (e) {
          throw new LlmStageFailure(
            feedbackFromLlmAttempt(
              raw,
              parsed,
              e instanceof Error ? e.message : "visual blueprint JSON 校验失败"
            )
          );
        }
      }
    );
    fs.writeFileSync(
      path.join(opts.logDir, "00-visual-blueprint.json"),
      `${JSON.stringify(blueprint, null, 2)}\n`
    );
    step.succeed();
    opts.recordStep("视觉规格识别完成", started, `${blueprint.sections.length} 个区域`, {
      stepId: "MR:VisualBlueprint",
    });
    return blueprint;
  } catch (e) {
    step.fail();
    opts.recordStep("视觉规格识别失败", started, e instanceof Error ? e.message : String(e), {
      stepId: "MR:VisualBlueprint",
    });
    throw e;
  }
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
 * 2) 输出 XML patch（slot 首次 / search 修补），应用到程序底稿后进入修复闭环。
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
  const runTiming = createMjsRunTiming(logDir, {
    emailKey,
    layoutVariantId: input.layoutVariantId ?? null,
  });
  const runStarted = stepStart();

  const stepDone = (
    label: string,
    startMs: number,
    detail?: string,
    timingOpts?: MjsRunTimingRecordOpts
  ) => {
    logStepDone(LOG_TAG, label, startMs, detail);
    runTiming.record(label, startMs, { detail, ...timingOpts });
  };
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
  // blueprint 识别完成后填入；JSON autofix 补标准 scale 时优先用设计图派生值
  let blueprintTokenFallbacks:
    | ReturnType<typeof tokenFallbacksFromBlueprint>
    | undefined;
  const runValidate = (source: string) =>
    runMjsAndValidate({
      mjsSource: source,
      mjsPath,
      repoRoot: REPO_ROOT,
      tokenFallbacks: blueprintTokenFallbacks,
      ...validateBase,
    });

  const generateStep = progress.forStep("MR:MjsGenerate");
  const validateStep = progress.forStep("MR:RunValidate");
  const visualLintStep = progress.forStep("MR:VisualLint");
  const runVisualLintGate = (
    templatePath: string,
    attempt: number,
    label: string,
    blueprint: ManualRestoreBlueprint
  ): VisualGateResult => {
    visualLintStep.start(attempt, {
      detail: mjsAttemptDetail(label, attempt),
      ...MJS_PROGRESS_OPTS,
    });
    const started = stepStart();
    const { blocking, warnings } = visualLintIssuesForRun(templatePath, blueprint);
    const accept = isVisualGateAcceptable(blocking, warnings, attempt);
    fs.writeFileSync(
      path.join(logDir, `06-visual-lint-attempt-${attempt}.json`),
      `${JSON.stringify(
        { ok: blocking.length === 0, accept, blocking, warnings },
        null,
        2
      )}\n`
    );
    if (!accept) {
      const issues = [...blocking, ...warnings];
      // 纯 warning（无硬伤）属于质量润色轮，不以「未通过/失败」措辞呈现
      const gateLabel =
        blocking.length > 0
          ? `visual lint 未通过（error ${blocking.length} / warning ${warnings.length}）`
          : `视觉质量润色（${warnings.length} 条提示，自动优化一轮）`;
      visualLintStep.failAttempt(attempt, {
        detail: mjsAttemptDetail(gateLabel, attempt),
        ...MJS_PROGRESS_OPTS,
      });
      stepDone(
        blocking.length > 0
          ? `  visual lint 未通过（尝试 ${attempt}）`
          : `  视觉质量润色触发（尝试 ${attempt}）`,
        started,
        issues.slice(0, 3).join(" · "),
        { stepId: "MR:VisualLint", attempt }
      );
      return { blocking, warnings, accept };
    }
    visualLintStep.succeed();
    stepDone(
      `  visual lint 通过（尝试 ${attempt}）`,
      started,
      warnings.length > 0 ? `保留 ${warnings.length} 条提示` : undefined,
      { stepId: "MR:VisualLint", attempt }
    );
    return { blocking, warnings, accept };
  };

  const blueprintLlm = wrapLlmClientWithQueue(
    createDoubaoRawClient(VISUAL_BLUEPRINT_TIMEOUT_MS, {
      maxTokens: VISUAL_BLUEPRINT_MAX_TOKENS,
    })
  );
  let visualBlueprint: ManualRestoreBlueprint;
  try {
    visualBlueprint = await llmExchangeContextStore.run(
      { pipelineRunId, emailKey, stage: "manual-restore-visual-blueprint" },
      async () =>
        createVisualBlueprint({
          llm: blueprintLlm,
          imageDataUrl,
          emailKey,
          displayName,
          idPrefix: mjsScaffold.idPrefix,
          progress,
          logDir,
          recordStep: (label, startMs, detail, timingOpts) => {
            stepDone(label, startMs, detail, timingOpts);
          },
        })
    );
  } catch (e) {
    runTiming.finish({
      ok: false,
      startMs: runStarted,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
  blueprintTokenFallbacks = tokenFallbacksFromBlueprint(visualBlueprint);

  const tAssets = stepStart();
  console.log(`${LOG_TAG} 程序：visual blueprint 资产槽 → Pexels/CDN 解析 …`);
  let injectedAssets: InjectedMjsAssets;
  try {
    injectedAssets = await resolveMjsAssetsFromDesign({
      imageDataUrl,
      emailKey,
      displayName,
      blueprint: visualBlueprint,
      progress,
      recordStep: (label, startMs, detail, timingOpts) => {
        stepDone(label, startMs, detail, timingOpts);
      },
    });
    stepDone("资产注入完成", tAssets, undefined, { stepId: "MR:AssetsPhase" });
    fs.writeFileSync(
      path.join(logDir, "00-injected-assets.txt"),
      `${formatInjectedAssetsForMjs(injectedAssets)}\n\n${injectedAssets.slotGuide}\n`
    );

    const deltaLlm = wrapLlmClientWithQueue(
      createDoubaoRawClient(MJS_GENERATE_TIMEOUT_MS, { maxTokens: MJS_DELTA_MAX_TOKENS })
    );
    const patchLlm = wrapLlmClientWithQueue(
      createDoubaoRawClient(MJS_PATCH_TIMEOUT_MS, { maxTokens: MJS_PATCH_MAX_TOKENS })
    );

    const result = await llmExchangeContextStore.run(
      { pipelineRunId, emailKey, stage: "manual-restore-mjs" },
      async () => {
        console.log(
          `${LOG_TAG} 注入上下文 → 豆包按底稿 patch 写 mjs（validate 失败则 patch）…`
        );
        const tMjsGenerate = stepStart();

        let mjsSource = "";
        let mjsStdout = "";
        let degradedIssues: string[] = [];
        let lastFailure: AttemptFailure | null = null;

        const attemptCtx: MjsAttemptContext = {
          imageDataUrl,
          logDir,
          mjsPath,
          mjsScaffold,
          injectedAssets,
          visualBlueprint,
          deltaLlm,
          patchLlm,
          generateStep,
          validateStep,
          stepDone,
          runValidate,
          runVisualLintGate,
        };

        for (let attempt = 1; attempt <= MAX_MJS_ATTEMPTS; attempt += 1) {
          const tAttempt = stepStart();
          let attemptOk = false;
          try {
            const useValidatePatchPath = canUsePatchRetryPath(attempt, lastFailure, mjsSource);

            if (attempt === 1) {
              generateStep.start(1, {
                detail: "豆包 MR:MjsGenerate API · 底稿+patch",
                ...MJS_PROGRESS_OPTS,
              });
            } else if (isPatchRetryKind(lastFailure?.kind)) {
              generateStep.retry(attempt, {
                detail: mjsAttemptDetail("程序 autofix → 豆包 patch", attempt),
                ...MJS_PROGRESS_OPTS,
              });
            } else {
              generateStep.retry(attempt, {
                detail: mjsAttemptDetail("豆包底稿 patch 修复", attempt),
                ...MJS_PROGRESS_OPTS,
              });
            }

            const outcome: AttemptOutcome = useValidatePatchPath
              ? await runPatchRepairAttempt(attemptCtx, attempt, mjsSource, lastFailure!)
              : await runGenerateAttempt(attemptCtx, attempt, mjsSource, lastFailure);
            mjsSource = outcome.mjsSource;
            if (outcome.kind === "success") {
              mjsStdout = outcome.mjsStdout;
              attemptOk = true;
              break;
            }
            if (outcome.kind === "degraded") {
              // 保底交付：产物可用但有未消除问题，交付并附清单（不空手而归）
              mjsStdout = outcome.mjsStdout;
              degradedIssues = outcome.issues;
              attemptOk = true;
              stepDone(
                `保底交付：剩余 ${outcome.issues.length} 条问题待人工处理`,
                tAttempt,
                outcome.issues.slice(0, 5).join("; "),
                { stepId: "MR:MjsGenerate", attempt }
              );
              break;
            }
            // 早停：连续两轮同一错误集合（零进展）且产物 node 可用 → 提前保底交付，
            // 不再烧注定无效的下一轮 patch 调用（2026-06-10 测试 4/6 各浪费一整轮的实证）
            if (
              (outcome.lastFailure.kind === "validate" || outcome.lastFailure.kind === "visual") &&
              sameFailureErrorSet(lastFailure, outcome.lastFailure)
            ) {
              degradedIssues = outcome.lastFailure.errors;
              attemptOk = true;
              stepDone(
                `同一错误集合连续两轮未收敛，提前保底交付（剩余 ${degradedIssues.length} 条待人工处理）`,
                tAttempt,
                degradedIssues.slice(0, 5).join("; "),
                { stepId: "MR:MjsGenerate", attempt }
              );
              break;
            }
            lastFailure = outcome.lastFailure;
          } catch (e) {
            // 瞬态传输错误（超时/中断/网络/5xx/429）消耗本次 attempt 后继续，
            // 避免单次 LLM 调用超时让整个 run 悬崖式失败
            if (!isTransientLlmError(e)) throw e;
            const message = e instanceof Error ? e.message : String(e);
            if (attempt >= MAX_MJS_ATTEMPTS) {
              if (!mjsSource || !lastFailure) throw e;
              // staging 产物来自最后一次 node 运行，与当前 mjsSource 同步 → 保底交付
              degradedIssues = [...lastFailure.errors, `LLM 调用瞬态失败：${message}`];
              attemptOk = true;
              stepDone(
                `保底交付：最终尝试 LLM 瞬态失败，剩余 ${lastFailure.errors.length} 条问题待人工处理`,
                tAttempt,
                message,
                { stepId: "MR:MjsGenerate", attempt }
              );
              break;
            }
            generateStep.failAttempt(attempt, {
              detail: mjsAttemptDetail(`LLM 调用瞬态失败（${message}），即将重试`, attempt),
              ...MJS_PROGRESS_OPTS,
            });
            stepDone(`  尝试 ${attempt} LLM 瞬态失败，进入下一次尝试`, tAttempt, message, {
              stepId: "MR:MjsGenerate",
              attempt,
            });
            // lastFailure 保持不变：下一轮沿用同样的修复上下文（patch 路径仍可用）
          } finally {
            stepDone(
              `尝试 ${attempt} ${attemptOk ? "成功" : "结束（将重试或失败）"}`,
              tAttempt,
              undefined,
              { attempt }
            );
          }
        }

        if (!mjsSource) {
          throw new Error("MR:MjsGenerate 未产出 mjs");
        }

        stepDone("MR:MjsGenerate 阶段完成", tMjsGenerate, undefined, { stepId: "MR:MjsGenerate" });

        const resolvedEmail = parseEmailKeyFromMjs(mjsSource) ?? emailKey;
        const outputDir =
          persistMode === "layout-only"
            ? stagingDir!
            : path.join(REPO_ROOT, "data/emails", resolvedEmail, "layouts/default");

        fs.writeFileSync(
          path.join(logDir, "03-validation.json"),
          `${JSON.stringify(
            { ok: degradedIssues.length === 0, issues: degradedIssues },
            null,
            2
          )}\n`
        );

        return {
          emailKey: resolvedEmail,
          mjsPath,
          outputDir,
          mjsStdout,
          validationOk: degradedIssues.length === 0,
          validationIssues: degradedIssues,
          logDir,
        };
      }
    );
    runTiming.finish({ ok: true, startMs: runStarted });
    return result;
  } catch (e) {
    runTiming.finish({
      ok: false,
      startMs: runStarted,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
