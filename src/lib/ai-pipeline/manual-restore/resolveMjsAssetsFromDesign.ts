import { createDoubaoClient } from "../adapters/doubaoClient";
import { parseLlmJson } from "../parseLlmJson";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import { wrapLlmClientWithQueue } from "../llmRequestQueue";
import { feedbackFromLlmAttempt, LlmStageFailure, appendRetryToUserText } from "../llmRetryFeedback";
import { AssetSlotsBlueprintSchema, type ManualRestoreBlueprint } from "./types";
import { resolveBlueprintAssets } from "./resolveBlueprintAssets";
import type { InjectedMjsAssets } from "./injectedMjsAssets";
import { buildAssetSlotsSystemPrompt, buildAssetSlotsUserText } from "./promptsAssetSlots";
import type { MjsRunTimingRecordOpts } from "./mjsRunTiming";
import { logStepDone, stepStart } from "./stepTiming";
import type { PipelineProgressReporter } from "../ports/PipelineProgressReporter";
import { createNoopPipelineProgressReporter } from "../ports/PipelineProgressReporter";

const LOG_TAG = "[manual-restore:mjs]";

function missingRequiredAssetIssues(
  blueprint: Pick<ManualRestoreBlueprint, "imageSlots" | "iconSlots">,
  resolved: Awaited<ReturnType<typeof resolveBlueprintAssets>>
): string[] {
  const issues: string[] = [];
  for (const slot of blueprint.imageSlots) {
    if (slot.required && !resolved.images[slot.slotId]) {
      issues.push(`必需图片资产未解析: PEXELS.${slot.slotId}（${slot.usage ?? slot.query}）`);
    }
  }
  for (const slot of blueprint.iconSlots) {
    if (slot.required && !resolved.icons[slot.slotId]) {
      issues.push(`必需图标资产未解析: ICON["${slot.slotId}"]（${slot.usage ?? slot.iconQuery}）`);
    }
  }
  return issues;
}

function blueprintToInjectedBlocks(
  blueprint: Pick<ManualRestoreBlueprint, "imageSlots" | "iconSlots">,
  resolved: Awaited<ReturnType<typeof resolveBlueprintAssets>>
): InjectedMjsAssets {
  const imageLines: string[] = [];
  const productUrls: string[] = [];

  for (const slot of blueprint.imageSlots) {
    const url = resolved.images[slot.slotId]?.url;
    if (!url) continue;
    if (slot.slotId === "hero") {
      imageLines.push(`  hero: ${JSON.stringify(url)},`);
    } else if (/^product\d+$/.test(slot.slotId)) {
      productUrls.push(url);
    } else {
      imageLines.push(`  ${JSON.stringify(slot.slotId)}: ${JSON.stringify(url)},`);
    }
  }

  if (productUrls.length > 0) {
    imageLines.push(
      `  products: [\n${productUrls.map((u) => `    ${JSON.stringify(u)},`).join("\n")}\n  ],`
    );
  }

  const iconEntries = Object.entries(resolved.icons).map(([slotId, v]) => {
    return `  ${JSON.stringify(slotId)}: ${JSON.stringify(v.url)},`;
  });

  const slotGuide = [
    "资产槽位（程序已搜图解析，禁止改写 URL）：",
    ...blueprint.imageSlots.map((s) => {
      const required = s.required ? "；必需" : "";
      const usage = s.usage ? `；用途：${s.usage}` : "";
      return `- PEXELS.${s.slotId} — ${s.query}${s.targetWidth ? ` (w≈${s.targetWidth})` : ""}${required}${usage}`;
    }),
    ...blueprint.iconSlots.map(
      (s) =>
        `- ICON["${s.slotId}"] — ${s.pack}/${s.iconQuery}${s.required ? "；必需" : ""}${s.hasBox ? "；设计图有外框" : ""}${s.usage ? `；用途：${s.usage}` : ""}（**禁止** ICON.${s.slotId} 点号访问，会被 JS 当成减法）`
    ),
  ].join("\n");

  const pexelsBlock = `const PEXELS = {\n${imageLines.join("\n")}\n};`;
  const iconBlock = `const ICON = {\n${iconEntries.join("\n")}\n};`;

  return { pexelsBlock, iconBlock, slotGuide };
}

/**
 * 豆包看图输出 imageSlots/iconSlots 搜索词 → 程序搜 Pexels/CDN → 注入常量（豆包 mjs 还原唯一资产路径）。
 */
export async function resolveMjsAssetsFromDesign(opts: {
  imageDataUrl: string;
  emailKey: string;
  displayName: string;
  blueprint?: ManualRestoreBlueprint;
  progress?: PipelineProgressReporter;
  recordStep?: (
    label: string,
    startMs: number,
    detail?: string,
    timingOpts?: MjsRunTimingRecordOpts
  ) => void;
}): Promise<InjectedMjsAssets> {
  const progress = opts.progress ?? createNoopPipelineProgressReporter();
  const assetSlotsStep = progress.forStep("MR:AssetSlots");
  const resolveAssetsStep = progress.forStep("MR:ResolveAssets");
  const llm = wrapLlmClientWithQueue(createDoubaoClient());

  const tAssetSlots = stepStart();

  let blueprint: Pick<ManualRestoreBlueprint, "imageSlots" | "iconSlots">;
  try {
    if (opts.blueprint) {
      blueprint = opts.blueprint;
      if (opts.recordStep) {
        opts.recordStep("  复用 visual blueprint 资产槽", tAssetSlots, undefined, {
          stepId: "MR:VisualBlueprint",
        });
      }
    } else {
      assetSlotsStep.start(1, { detail: "豆包 MR:AssetSlots（资产槽 JSON）…" });
      console.log(`${LOG_TAG}   豆包 MR:AssetSlots（资产槽 JSON）…`);
      blueprint = await callLlmStageWithRetry(
        { stage: "MR:AssetSlots", stepProgress: assetSlotsStep },
        async ({ feedback }) => {
          const raw = await llm.complete([
            { role: "system", content: buildAssetSlotsSystemPrompt() },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: opts.imageDataUrl } },
                {
                  type: "text",
                  text: appendRetryToUserText(buildAssetSlotsUserText(), feedback),
                },
              ],
            },
          ]);
          let parsed: unknown;
          try {
            parsed = parseLlmJson(raw);
          } catch (e) {
            throw new LlmStageFailure(
              feedbackFromLlmAttempt(
                raw,
                null,
                e instanceof Error ? e.message : "资产槽 JSON 解析失败"
              )
            );
          }
          try {
            return AssetSlotsBlueprintSchema.parse(parsed);
          } catch (e) {
            throw new LlmStageFailure(
              feedbackFromLlmAttempt(
                raw,
                parsed,
                e instanceof Error ? e.message : "资产槽 JSON 校验失败"
              )
            );
          }
        }
      );
    }
  } catch (e) {
    assetSlotsStep.fail();
    throw e;
  }

  if (opts.recordStep) {
    opts.recordStep("  MR:AssetSlots 完成", tAssetSlots, undefined, { stepId: "MR:AssetSlots" });
  } else {
    logStepDone(LOG_TAG, "  MR:AssetSlots 完成", tAssetSlots);
  }
  if (!opts.blueprint) {
    assetSlotsStep.succeed();
  }

  resolveAssetsStep.start(1, { detail: "Pexels/CDN 搜图解析…" });
  const tPexels = stepStart();
  console.log(`${LOG_TAG}   Pexels/CDN 搜图解析…`);
  let resolved;
  try {
    resolved = await resolveBlueprintAssets(blueprint);
  } catch (e) {
    resolveAssetsStep.fail();
    throw e;
  }
  const pexelsDetail = `图 ${Object.keys(resolved.images).length} · 标 ${Object.keys(resolved.icons).length}`;
  if (opts.recordStep) {
    opts.recordStep("  Pexels/CDN 搜图完成", tPexels, pexelsDetail, { stepId: "MR:ResolveAssets" });
  } else {
    logStepDone(LOG_TAG, "  Pexels/CDN 搜图完成", tPexels, pexelsDetail);
  }
  if (Object.keys(resolved.images).length === 0 && blueprint.imageSlots.length > 0) {
    resolveAssetsStep.fail();
    throw new Error("Pexels 资产解析全部失败");
  }
  const requiredIssues = missingRequiredAssetIssues(blueprint, resolved);
  if (requiredIssues.length > 0) {
    resolveAssetsStep.fail();
    throw new Error(requiredIssues.join("\n"));
  }
  resolveAssetsStep.succeed();

  return blueprintToInjectedBlocks(blueprint, resolved);
}

/** 校验 stitch 后 mjs 不含豆包自编的远程图源 URL（注入块除外）。 */
export function assertNoHallucinatedAssetUrls(mjsSource: string, injected: InjectedMjsAssets): void {
  const injectedUrls = new Set<string>();
  for (const m of [...injected.pexelsBlock.matchAll(/https:\/\/[^\s'"]+/g)]) {
    injectedUrls.add(m[0]!);
  }
  for (const m of [...injected.iconBlock.matchAll(/https:\/\/[^\s'"]+/g)]) {
    injectedUrls.add(m[0]!);
  }

  const outside = mjsSource
    .replace(injected.pexelsBlock, "")
    .replace(injected.iconBlock, "");
  const rogue = [...outside.matchAll(/https:\/\/(?:images\.pexels\.com|cdn\.jsdelivr\.net)[^\s'"]+/g)]
    .map((m) => m[0]!)
    .filter((url) => !injectedUrls.has(url));

  if (rogue.length > 0) {
    throw new Error(`mjs 含未注入的远程图源 URL（禁止豆包自编）：${rogue.slice(0, 3).join(", ")}`);
  }
}
