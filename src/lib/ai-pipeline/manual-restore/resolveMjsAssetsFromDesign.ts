import { createDoubaoClient } from "../adapters/doubaoClient";
import { parseLlmJson } from "../parseLlmJson";
import { callLlmStageWithRetry } from "../callLlmStageWithRetry";
import { wrapLlmClientWithQueue } from "../llmRequestQueue";
import { feedbackFromLlmAttempt, LlmStageFailure, appendRetryToUserText } from "../llmRetryFeedback";
import { AssetSlotsBlueprintSchema } from "./types";
import { resolveBlueprintAssets } from "./resolveBlueprintAssets";
import type { InjectedMjsAssets } from "./injectedMjsAssets";
import { buildAssetSlotsSystemPrompt, buildAssetSlotsUserText } from "./promptsAssetSlots";
import { logStepDone, stepStart } from "./stepTiming";
import type { PipelineProgressReporter } from "../ports/PipelineProgressReporter";
import { createNoopPipelineProgressReporter } from "../ports/PipelineProgressReporter";

const LOG_TAG = "[manual-restore:mjs]";

function blueprintToInjectedBlocks(
  blueprint: ReturnType<typeof AssetSlotsBlueprintSchema.parse>,
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
    ...blueprint.imageSlots.map(
      (s) => `- PEXELS.${s.slotId} — ${s.query}${s.targetWidth ? ` (w≈${s.targetWidth})` : ""}`
    ),
    ...blueprint.iconSlots.map(
      (s) => `- ICON.${s.slotId} — ${s.pack}/${s.iconQuery}`
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
  progress?: PipelineProgressReporter;
}): Promise<InjectedMjsAssets> {
  const progress = opts.progress ?? createNoopPipelineProgressReporter();
  const assetSlotsStep = progress.forStep("MR:AssetSlots");
  const resolveAssetsStep = progress.forStep("MR:ResolveAssets");
  const llm = wrapLlmClientWithQueue(createDoubaoClient());

  assetSlotsStep.start(1, { detail: "豆包 MR:AssetSlots（资产槽 JSON）…" });
  const tAssetSlots = stepStart();
  console.log(`${LOG_TAG}   豆包 MR:AssetSlots（资产槽 JSON）…`);

  let blueprint;
  try {
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
  } catch (e) {
    assetSlotsStep.fail();
    throw e;
  }

  logStepDone(LOG_TAG, "  MR:AssetSlots 完成", tAssetSlots);
  assetSlotsStep.succeed();

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
  logStepDone(
    LOG_TAG,
    "  Pexels/CDN 搜图完成",
    tPexels,
    `图 ${Object.keys(resolved.images).length} · 标 ${Object.keys(resolved.icons).length}`
  );
  if (Object.keys(resolved.images).length === 0 && blueprint.imageSlots.length > 0) {
    resolveAssetsStep.fail();
    throw new Error("Pexels 资产解析全部失败");
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
