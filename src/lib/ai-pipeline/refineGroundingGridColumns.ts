import { listPexelsImageSlots } from "./groundingImage";
import type { GroundingResult, GroundingSection, IconQueryItem, TextExtractResult } from "./types";

function sectionHaystack(section: GroundingSection): string {
  return `${section.name ?? ""} ${section.components ?? ""}`.toLowerCase();
}

function isTrustOrServiceSection(section: GroundingSection): boolean {
  const h = sectionHaystack(section);
  return /保障|服务|trust|certif|warranty|ul|tüv|shops|门店|1,?800/i.test(h);
}

function isSocialSection(section: GroundingSection): boolean {
  const h = sectionHaystack(section);
  return /社交|social|twitter|instagram|facebook|tiktok|平台/i.test(h);
}

function isFinancingFeatureSection(section: GroundingSection): boolean {
  const h = sectionHaystack(section);
  return /金融|financ|affirm|quick|hidden|分期/i.test(h);
}

function countParagraphs(textExtract: TextExtractResult, sectionId: string): number {
  return textExtract.regions.find((r) => r.regionId === sectionId)?.paragraphs.length ?? 0;
}

/**
 * 从 B2 图标数、A 配图槽数、B3 条数推断栅格列数（Stage A 的 gridColumns 仅为 hint，可被抬高）。
 */
export function inferGridColumnsForSection(
  section: GroundingSection,
  iconQueries: IconQueryItem[],
  textExtract: TextExtractResult
): number | undefined {
  const sectionId = section.sectionId;
  const iconCount = iconQueries.filter((q) => q.regionId === sectionId).length;
  const imageSlots = listPexelsImageSlots(section);
  const imageSlotCount = imageSlots.length;
  const paraCount = countParagraphs(textExtract, sectionId);
  const aHint = section.layoutHints?.gridColumns;

  if (isSocialSection(section) && imageSlotCount >= 4) return 4;
  if (imageSlotCount >= 4) return 4;
  if (imageSlotCount === 3) return 3;

  if (isTrustOrServiceSection(section)) {
    if (iconCount >= 4 || paraCount >= 7) return 4;
    if (iconCount >= 3 || paraCount >= 5) return Math.max(3, iconCount, aHint ?? 0) || 3;
    if (paraCount >= 4) return 4;
  }

  if (isFinancingFeatureSection(section) && (iconCount >= 2 || paraCount >= 6)) {
    return 2;
  }

  if (imageSlotCount === 2) return 2;
  if (iconCount >= 4) return 4;
  if (iconCount === 3) return 3;
  if (iconCount === 2 && paraCount >= 4) return 2;

  return aHint && aHint > 0 ? aHint : undefined;
}

/** B 阶段后抬高 layoutHints.gridColumns，供 Stage C 与 D 使用。 */
export function refineGroundingGridColumns(
  grounding: GroundingResult,
  iconQueries: IconQueryItem[],
  textExtract: TextExtractResult
): { grounding: GroundingResult; adjustedSectionIds: string[] } {
  const adjustedSectionIds: string[] = [];
  const sections = grounding.sections.map((section) => {
    const inferred = inferGridColumnsForSection(section, iconQueries, textExtract);
    if (inferred == null || inferred <= 0) return section;
    const prev = section.layoutHints?.gridColumns ?? 0;
    const next = Math.max(prev, inferred);
    if (next === prev && prev > 0) return section;
    adjustedSectionIds.push(section.sectionId);
    return {
      ...section,
      layoutHints: {
        ...section.layoutHints,
        gridColumns: next,
      },
    };
  });
  return {
    grounding: { ...grounding, sections },
    adjustedSectionIds,
  };
}
