import { searchPexelsCandidates, type PexelsOrientation } from "../pexelsClient";
import { PEXELS_SEARCH_TARGET_WIDTH } from "./compactTypes";
import { resolveIconCdnCandidates } from "./iconCdnResolve";
import { verifyUrlReachable } from "./verifyUrlReachable";
import type { AssetResolver, AssetResolveInput, AssetResolveResult } from "./ports/AssetResolver";

/** 每个槽位最多取几个候选逐个验活；首个可访问者即采用。 */
const ASSET_CANDIDATE_LIMIT = 5;

export function createDefaultAssetResolver(): AssetResolver {
  return {
    async resolve(input: AssetResolveInput): Promise<AssetResolveResult> {
      if (input.kind === "pexels-photo") {
        const targetWidth = input.targetWidth ?? PEXELS_SEARCH_TARGET_WIDTH;
        const outcome = await searchPexelsCandidates(
          input.query,
          targetWidth,
          ASSET_CANDIDATE_LIMIT,
          input.orientation as PexelsOrientation | undefined
        );
        if (!outcome.ok) {
          return { ok: false, reason: outcome.reason, detail: outcome.detail };
        }
        for (const match of outcome.matches) {
          if (await verifyUrlReachable(match.url)) {
            return { ok: true, url: match.url, alt: match.alt };
          }
        }
        return {
          ok: false,
          reason: "PEXELS_ALL_CANDIDATES_UNREACHABLE",
          detail: `${outcome.matches.length} 个候选均不可访问`,
        };
      }

      const candidates = resolveIconCdnCandidates(
        input.pack,
        input.iconQuery,
        ASSET_CANDIDATE_LIMIT
      );
      if (candidates.length === 0) {
        return { ok: false, reason: "ICON_NOT_FOUND" };
      }
      for (const icon of candidates) {
        if (await verifyUrlReachable(icon.src)) {
          return { ok: true, url: icon.src, tintable: icon.tintable };
        }
      }
      return {
        ok: false,
        reason: "ICON_ALL_CANDIDATES_UNREACHABLE",
        detail: `${candidates.length} 个候选均不可访问`,
      };
    },
  };
}

export async function resolveAsset(
  resolver: AssetResolver,
  input: AssetResolveInput
): Promise<AssetResolveResult> {
  return resolver.resolve(input);
}
