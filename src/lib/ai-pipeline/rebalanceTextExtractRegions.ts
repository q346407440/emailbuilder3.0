import type { GroundingSection } from "./types";
import type { TextExtractPayloadParsed } from "./schemas/b3-text-extract";

const PRODUCT_HEADLINE_PATTERN = /^TAKE ANOTHER LOOK\b/i;

function paragraphPlainText(p: {
  textBody: { paragraphs: Array<{ runs: Array<{ text: string }> }> };
}): string {
  return p.textBody.paragraphs
    .map((para) => para.runs.map((r) => r.text).join(""))
    .join("\n");
}

function isProductSection(section: GroundingSection): boolean {
  const name = (section.name ?? "").toLowerCase();
  const components = (section.components ?? "").toLowerCase();
  return (
    /商品|产品|推荐|product|cart|sku/i.test(name) ||
    /商品|产品|product|ebike|bike/i.test(components)
  );
}

function findProductSectionId(sections: GroundingSection[]): string | undefined {
  const hit = sections.find(isProductSection);
  if (hit) return hit.sectionId;
  const s3 = sections.find((s) => s.sectionId === "s3");
  return s3?.sectionId;
}

function reindexParagraphs(regionId: string, paragraphs: TextExtractPayloadParsed["regions"][0]["paragraphs"]) {
  return paragraphs.map((p, index) => ({
    ...p,
    textId: `${regionId}-t${index}`,
    role: p.role,
    textBody: p.textBody,
  }));
}

/**
 * B3 后处理：将误落入首屏等区的商品区小标题挪回商品区（如 TAKE ANOTHER LOOK:）。
 */
export function rebalanceTextExtractRegions(
  payload: TextExtractPayloadParsed,
  groundingSections: GroundingSection[]
): TextExtractPayloadParsed {
  const productRegionId = findProductSectionId(groundingSections);
  if (!productRegionId) return payload;

  const regions = payload.regions.map((r) => ({
    ...r,
    paragraphs: [...r.paragraphs],
  }));

  const toMove: Array<{
    paragraph: (typeof regions)[0]["paragraphs"][0];
    fromRegionId: string;
  }> = [];

  for (const region of regions) {
    if (region.regionId === productRegionId) continue;
    const kept: typeof region.paragraphs = [];
    for (const p of region.paragraphs) {
      const plain = paragraphPlainText(p);
      if (PRODUCT_HEADLINE_PATTERN.test(plain)) {
        toMove.push({ paragraph: p, fromRegionId: region.regionId });
      } else {
        kept.push(p);
      }
    }
    region.paragraphs = kept;
  }

  if (toMove.length === 0) return payload;

  let productRegion = regions.find((r) => r.regionId === productRegionId);
  if (!productRegion) {
    productRegion = { regionId: productRegionId, paragraphs: [] };
    regions.push(productRegion);
  }

  const existingHeadline = productRegion.paragraphs.some((p) =>
    PRODUCT_HEADLINE_PATTERN.test(paragraphPlainText(p))
  );
  if (!existingHeadline) {
    productRegion.paragraphs = [
      ...toMove.map((m) => m.paragraph),
      ...productRegion.paragraphs,
    ];
  }

  for (const region of regions) {
    region.paragraphs = reindexParagraphs(region.regionId, region.paragraphs);
  }

  return {
    ...payload,
    regions: regions.filter((r) => r.paragraphs.length > 0),
  };
}
