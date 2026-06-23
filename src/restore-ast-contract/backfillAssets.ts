import { createDefaultAssetResolver } from "../lib/ai-pipeline/assetResolve";
import { IMAGE_PLACEHOLDER_PUBLIC_PATH } from "../lib/imagePlaceholder";
import {
  resolveStoreBadgeAssetId,
  resolveStoreBadgeUrl,
} from "../lib/ai-pipeline/storeBadgeResolve";
import type { AssetResolver } from "../lib/ai-pipeline/ports/AssetResolver";
import type { EmailTemplate } from "../types/email";
import type { AssetRequest } from "./buildCtx";

export type ResolvedAssetEntry = {
  blockId: string;
  kind: "image" | "icon";
  query: string;
  pack?: import("./types").IconPack;
  ok: boolean;
  url?: string;
  alt?: string;
  /** 摄影图搜图失败但已回落本地占位图时为 true（badge / icon 不适用）。 */
  placeholderFallback?: boolean;
  reason?: string;
  detail?: string;
};

/** 落盘形态：供 fixtures 复用，避免每次冒烟都搜图。 */
export type ResolvedAssetsManifest = {
  resolvedAt: string;
  items: ResolvedAssetEntry[];
};

function isStoreBadgeImageQuery(query: string): boolean {
  return resolveStoreBadgeAssetId(query) !== null;
}

async function resolveOne(
  request: AssetRequest,
  resolver: AssetResolver
): Promise<ResolvedAssetEntry> {
  if (request.kind === "image") {
    const base = {
      blockId: request.blockId,
      kind: request.kind as const,
      query: request.query,
    };

    if (isStoreBadgeImageQuery(request.query)) {
      const badge = resolveStoreBadgeUrl(request.query, {
        assetBase:
          process.env.STORE_BADGE_ASSET_BASE?.trim() || process.env.PUBLIC_ASSET_BASE?.trim(),
      });
      if (badge) {
        return { ...base, ok: true, url: badge.publicPath, alt: badge.alt };
      }
      return {
        ...base,
        ok: false,
        reason: "STORE_BADGE_NOT_FOUND",
        detail: `固定 badge 标识未解析到本地资产：${request.query}`,
      };
    }

    const result = await resolver.resolve({
      kind: "pexels-photo",
      query: request.query,
      targetWidth: request.targetWidth,
    });
    if (result.ok) {
      return { ...base, ok: true, url: result.url, alt: result.alt };
    }
    return {
      ...base,
      ok: true,
      url: IMAGE_PLACEHOLDER_PUBLIC_PATH,
      alt: request.query,
      placeholderFallback: true,
      reason: result.reason,
      detail: result.detail,
    };
  }

  const base = {
    blockId: request.blockId,
    kind: request.kind as const,
    query: request.query,
    pack: request.pack,
  };

  const result = await resolver.resolve({
    kind: "icon-cdn",
    pack: request.pack,
    iconQuery: request.query,
  });
  if (result.ok) {
    return { ...base, ok: true, url: result.url };
  }
  return { ...base, ok: false, reason: result.reason, detail: result.detail };
}

/** 批量搜索 + 验活，产出可落盘清单（第 3 步）。 */
export async function resolveAstAssetRequests(
  requests: AssetRequest[],
  resolver: AssetResolver = createDefaultAssetResolver()
): Promise<ResolvedAssetsManifest> {
  const items = await Promise.all(requests.map((req) => resolveOne(req, resolver)));
  return {
    resolvedAt: new Date().toISOString(),
    items,
  };
}

function applyUrlToBlock(template: EmailTemplate, entry: ResolvedAssetEntry): boolean {
  if (!entry.ok || !entry.url) return false;
  const block = template.blocks[entry.blockId];
  if (!block) return false;

  if (entry.kind === "image") {
    const bg = block.wrapperStyle?.backgroundImage;
    if (!bg || typeof bg !== "object") return false;
    block.wrapperStyle = {
      ...block.wrapperStyle,
      backgroundImage: { ...bg, src: entry.url },
    };
    return true;
  }

  if (entry.kind === "icon") {
    block.props = { ...block.props, src: entry.url };
    return true;
  }

  return false;
}

function assetMatchKey(
  kind: "image" | "icon",
  query: string,
  pack?: import("./types").IconPack
): string {
  return kind === "icon" ? `icon:${pack ?? ""}:${query}` : `image::${query}`;
}

/** 将旧 manifest 的 URL 按 query/pack 映射到本轮组装产出的 blockId（版式序号变化时复用 assets-resolved.json）。 */
export function remapResolvedManifestToRequests(
  manifest: ResolvedAssetsManifest,
  requests: AssetRequest[]
): ResolvedAssetsManifest {
  const byKey = new Map<string, ResolvedAssetEntry>();
  for (const item of manifest.items) {
    byKey.set(assetMatchKey(item.kind, item.query, item.pack), item);
  }

  const items = requests.map((req) => {
    const key =
      req.kind === "icon"
        ? assetMatchKey("icon", req.query, req.pack)
        : assetMatchKey("image", req.query);
    const hit = byKey.get(key);
    if (hit) {
      return { ...hit, blockId: req.blockId };
    }
    if (req.kind === "image") {
      if (isStoreBadgeImageQuery(req.query)) {
        return {
          blockId: req.blockId,
          kind: "image",
          query: req.query,
          ok: false,
          reason: "MANIFEST_QUERY_MISS",
        };
      }
      return {
        blockId: req.blockId,
        kind: "image",
        query: req.query,
        ok: true,
        url: IMAGE_PLACEHOLDER_PUBLIC_PATH,
        alt: req.query,
        placeholderFallback: true,
        reason: "MANIFEST_QUERY_MISS",
      };
    }
    return {
      blockId: req.blockId,
      kind: "icon",
      query: req.query,
      pack: req.pack,
      ok: false,
      reason: "MANIFEST_QUERY_MISS",
    };
  });

  return { ...manifest, items };
}

export function backfillTemplateFromManifest(
  template: EmailTemplate,
  manifest: ResolvedAssetsManifest,
  requests: AssetRequest[]
): {
  template: EmailTemplate;
  resolvedCount: number;
  unresolvedOptional: AssetRequest[];
} {
  const next = structuredClone(template) as EmailTemplate;
  let resolvedCount = 0;

  for (const entry of manifest.items) {
    if (applyUrlToBlock(next, entry)) {
      resolvedCount += 1;
    }
  }

  const resolvedIds = new Set(
    manifest.items.filter((i) => i.ok && i.url).map((i) => i.blockId)
  );

  const unresolvedOptional: AssetRequest[] = [];

  for (const req of requests) {
    if (resolvedIds.has(req.blockId)) continue;
    unresolvedOptional.push(req);
  }

  return { template: next, resolvedCount, unresolvedOptional };
}

/** 搜索 + 验活 + 回填（第 3 步完整入口）。 */
export async function resolveAndBackfillAssets(
  template: EmailTemplate,
  requests: AssetRequest[],
  resolver: AssetResolver = createDefaultAssetResolver()
): Promise<{
  template: EmailTemplate;
  manifest: ResolvedAssetsManifest;
  resolvedCount: number;
  unresolvedOptional: AssetRequest[];
}> {
  const manifest = await resolveAstAssetRequests(requests, resolver);
  const backfilled = backfillTemplateFromManifest(template, manifest, requests);
  return { ...backfilled, manifest };
}
