import type { PipelineLlmStage } from "../stageSchemas";
import type { LlmMessageContentPart } from "../ports/LlmClient";
import { formatB1TierEnumsForPrompt } from "../b1StyleTierPresets";
import { listSimpleIconSlugsForPrompt } from "../iconCdnResolve";
import { formatGroundingSectionsForPrompt } from "./stageAGroundingPrompt";
import type {
  AssetManifest,
  GroundingResult,
  GroundingSection,
  NormalizedStyleTokens,
  TextExtractResult,
} from "../types";

export type UserPromptContext = {
  imageDataUrl: string;
  stage: PipelineLlmStage;
  grounding?: GroundingResult;
  section?: GroundingSection;
  styleTokens?: NormalizedStyleTokens;
  textExtract?: TextExtractResult;
  assetManifest?: AssetManifest;
  b1EnumTable?: string;
  allowedIconSlugs?: string[];
};

export function buildUserPrompt(ctx: UserPromptContext): LlmMessageContentPart[] {
  const parts: LlmMessageContentPart[] = [
    { type: "image_url", image_url: { url: ctx.imageDataUrl } },
    { type: "text", text: buildUserText(ctx) },
  ];
  return parts;
}

function buildUserText(ctx: UserPromptContext): string {
  switch (ctx.stage) {
    case "B1":
      return `根据设计图选择全局样式档位 JSON。\n枚举表：\n${ctx.b1EnumTable ?? formatB1TierEnumsForPrompt()}\n区域：\n${formatGroundingSectionsForPrompt(ctx.grounding?.sections ?? [])}\n只输出 JSON。`;
    case "B2":
      return `识别图标并输出查询 JSON 数组。\n区域：\n${formatGroundingSectionsForPrompt(ctx.grounding?.sections ?? [])}\n允许 slug：${(ctx.allowedIconSlugs ?? listSimpleIconSlugsForPrompt()).join(", ")}\n只输出 JSON 数组。`;
    case "C":
      return buildSectionPrompt(ctx);
    default:
      return "只输出 JSON。";
  }
}

function buildSectionPrompt(ctx: UserPromptContext): string {
  const section = ctx.section;
  const sectionId = section?.sectionId ?? "s1";
  const sectionTexts =
    ctx.textExtract?.regions.find((r) => r.regionId === sectionId)?.paragraphs ?? [];
  const manifestSnippet = {
    images: ctx.assetManifest?.images ?? {},
    icons: ctx.assetManifest?.icons ?? {},
  };
  return `只生成区域 ${sectionId}（${section?.name ?? ""}）的区块树 JSON。
只输出 JSON 对象 { root }，不要 schemaVersion、sectionId 等协议字段。

区域: ${JSON.stringify(section)}
样式: ${JSON.stringify(ctx.styleTokens ?? {})}
本区文案: ${JSON.stringify(sectionTexts)}
资产表: ${JSON.stringify(manifestSnippet)}`;
}

export function buildSectionUserPrompt(
  ctx: Omit<UserPromptContext, "stage"> & { section: GroundingSection }
): LlmMessageContentPart[] {
  return buildUserPrompt({ ...ctx, stage: "C" });
}
