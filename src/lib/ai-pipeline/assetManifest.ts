import type { AssetManifest, GroundingResult, IconQueryItem, ImageResolved } from "./types";
import {
  resolveGroundingImages as resolveGroundingImagesCore,
  resolveIconQueries as resolveIconQueriesCore,
} from "./resolvePipelineAssets";
import type { AssetResolver } from "./ports/AssetResolver";

export function mergeAssetManifest(
  images: AssetManifest["images"],
  icons: AssetManifest["icons"]
): AssetManifest {
  return { images: { ...images }, icons: { ...icons } };
}

export async function resolveImagesFromGrounding(
  grounding: GroundingResult,
  resolver: AssetResolver
): Promise<{ resolved: ImageResolved[]; images: AssetManifest["images"] }> {
  return resolveGroundingImagesCore(grounding, resolver);
}

export async function resolveIconsFromQueries(
  queries: IconQueryItem[],
  resolver: AssetResolver
): Promise<AssetManifest["icons"]> {
  return resolveIconQueriesCore(queries, resolver);
}
