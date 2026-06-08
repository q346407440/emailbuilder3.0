import { searchPexelsBest, type PexelsOrientation } from "../pexelsClient";
import { PEXELS_SEARCH_TARGET_WIDTH } from "./compactTypes";
import { resolveIconCdnUrl } from "./iconCdnResolve";
import type { AssetResolver, AssetResolveInput, AssetResolveResult } from "./ports/AssetResolver";

export function createDefaultAssetResolver(): AssetResolver {
  return {
    async resolve(input: AssetResolveInput): Promise<AssetResolveResult> {
      if (input.kind === "pexels-photo") {
        const outcome = await searchPexelsBest(
          input.query,
          input.targetWidth ?? PEXELS_SEARCH_TARGET_WIDTH,
          input.orientation as PexelsOrientation | undefined
        );
        if (!outcome.ok) {
          return { ok: false, reason: outcome.reason, detail: outcome.detail };
        }
        return { ok: true, url: outcome.match.url, alt: outcome.match.alt };
      }
      const icon = resolveIconCdnUrl(input.pack, input.iconQuery);
      if (!icon) return { ok: false, reason: "ICON_NOT_FOUND" };
      return { ok: true, url: icon.src, tintable: icon.tintable };
    },
  };
}

export async function resolveAsset(
  resolver: AssetResolver,
  input: AssetResolveInput
): Promise<AssetResolveResult> {
  return resolver.resolve(input);
}
