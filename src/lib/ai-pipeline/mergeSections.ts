import type {
  AssetManifest,
  CompactSectionTree,
  GroundingResult,
  IconQueryItem,
  MergedEmailDraft,
  NormalizedStyleTokens,
  StyleTokensResult,
  TextExtractResult,
} from "./types";
import { compileCompactSectionRoot } from "./compile/compileCompactSection";
import { groundingResultSchema } from "./schemas/a-grounding";
import {
  buildSectionAllowlists,
  sanitizeCompactSectionRoot,
} from "./sectionCompactGuard";

export type MergeSectionsInput = {
  grounding: GroundingResult;
  styleTokens: NormalizedStyleTokens;
  canvas: StyleTokensResult["canvas"];
  textExtract: TextExtractResult;
  assetManifest: AssetManifest;
  iconQueries: IconQueryItem[];
  sections: CompactSectionTree[];
  emailKey: string;
  layoutVariantId: string;
};

/** 阶段 D：按 A.order 合并各区 IR + 资产表。 */
export function mergeSections(input: MergeSectionsInput): MergedEmailDraft {
  const parsedGrounding = groundingResultSchema.parse(input.grounding);
  const sectionById = new Map(parsedGrounding.sections.map((s) => [s.sectionId, s]));
  const compactById = new Map(input.sections.map((s) => [s.sectionId, s]));

  const ordered: CompactSectionTree[] = [];
  for (const sectionId of parsedGrounding.order) {
    const compact = compactById.get(sectionId);
    const groundingSection = sectionById.get(sectionId);
    if (!compact || !groundingSection) continue;
    const allowlists = buildSectionAllowlists(
      sectionId,
      groundingSection,
      input.textExtract,
      input.iconQueries,
      input.assetManifest
    );
    const sanitizedRoot = sanitizeCompactSectionRoot(
      compact.root,
      allowlists,
      groundingSection
    );
    if (!sanitizedRoot) continue;
    const compiledRoot = compileCompactSectionRoot(sanitizedRoot, groundingSection);
    if (!compiledRoot) continue;
    ordered.push({
      ...compact,
      root: compiledRoot,
    });
  }

  return {
    sectionOrder: ordered.map((s) => s.sectionId),
    sections: ordered,
    canvas: input.canvas,
    styleTokens: input.styleTokens,
    textExtract: input.textExtract,
    assetManifest: input.assetManifest,
    grounding: parsedGrounding,
    emailKey: input.emailKey,
    layoutVariantId: input.layoutVariantId,
  };
}
