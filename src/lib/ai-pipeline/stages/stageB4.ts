import type { AssetResolver } from "../ports/AssetResolver";
import { resolveImagesFromGrounding } from "../assetManifest";
import type { GroundingResult, ImageResolved } from "../types";

export async function runStageB4(
  grounding: GroundingResult,
  assets: AssetResolver
): Promise<{ resolved: ImageResolved[]; images: Record<string, { url: string; alt?: string; fit?: string; position?: string }> }> {
  const { resolved, images } = await resolveImagesFromGrounding(grounding, assets);
  return { resolved, images };
}
