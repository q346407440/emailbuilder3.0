import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type StoreBadgeAsset = {
  file: string;
  intrinsicSize: { w: number; h: number };
  sourcePage?: string;
  sourceThumb?: string;
};

export type StoreBadgesIndex = {
  kind: "store-badges";
  version: string;
  publicBasePath: string;
  assets: Record<string, StoreBadgeAsset>;
  aliases?: Record<string, string>;
};

export type StoreBadgeResolveResult = {
  assetId: string;
  /** 浏览器/Vite 可访问路径（以 / 开头）。 */
  publicPath: string;
  alt: string;
};

const indexCache: { index: StoreBadgesIndex | null } = { index: null };

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../..");
}

export function loadStoreBadgesIndex(): StoreBadgesIndex {
  if (indexCache.index) return indexCache.index;
  const indexPath = path.join(repoRoot(), "data/static-assets/store-badges-index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as StoreBadgesIndex;
  indexCache.index = index;
  return index;
}

/** 与 icon query 一致：小写、空白→连字符。 */
export function normalizeStoreBadgeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "-");
}

/** 去掉非字母数字，便于匹配 appstorebadge / googleplaybadge 等变体。 */
export function compactStoreBadgeQuery(query: string): string {
  return normalizeStoreBadgeQuery(query).replace(/[^a-z0-9]/g, "");
}

function buildLookup(index: StoreBadgesIndex): Map<string, string> {
  const map = new Map<string, string>();

  const put = (key: string, assetId: string) => {
    const normalized = normalizeStoreBadgeQuery(key);
    if (normalized) map.set(normalized, assetId);
    const compact = compactStoreBadgeQuery(key);
    if (compact) map.set(compact, assetId);
  };

  for (const assetId of Object.keys(index.assets)) {
    put(assetId, assetId);
  }
  for (const [alias, assetId] of Object.entries(index.aliases ?? {})) {
    put(alias, assetId);
  }

  return map;
}

/** 将 image query 解析为 store badge 资产 id；非 badge 返回 null。 */
export function resolveStoreBadgeAssetId(query: string, index = loadStoreBadgesIndex()): string | null {
  const lookup = buildLookup(index);
  const normalized = normalizeStoreBadgeQuery(query);
  const compact = compactStoreBadgeQuery(query);
  return lookup.get(normalized) ?? lookup.get(compact) ?? null;
}

function publicPathForAsset(index: StoreBadgesIndex, assetId: string): string | null {
  const asset = index.assets[assetId];
  if (!asset?.file) return null;
  const base = index.publicBasePath.replace(/\/$/, "");
  return `${base}/${asset.file}`;
}

function localPublicFilePath(publicPath: string): string {
  const relative = publicPath.replace(/^\//, "");
  return path.join(repoRoot(), "public", relative);
}

function altForAssetId(assetId: string): string {
  if (assetId === "app-store-badge") return "Download on the App Store";
  if (assetId === "google-play-badge") return "Get it on Google Play";
  return assetId;
}

/**
 * image query 命中 store badge 时返回公共静态路径；否则 null（走 Pexels）。
 * 可选 `assetBase` 前缀（如 http://127.0.0.1:5180）拼绝对 URL。
 */
export function resolveStoreBadgeUrl(
  query: string,
  options?: { assetBase?: string; index?: StoreBadgesIndex }
): StoreBadgeResolveResult | null {
  const index = options?.index ?? loadStoreBadgesIndex();
  const assetId = resolveStoreBadgeAssetId(query, index);
  if (!assetId) return null;

  const publicPath = publicPathForAsset(index, assetId);
  if (!publicPath) return null;

  const localFile = localPublicFilePath(publicPath);
  if (!fs.existsSync(localFile)) return null;

  const base = options?.assetBase?.replace(/\/$/, "") ?? "";
  const url = base ? `${base}${publicPath}` : publicPath;

  return {
    assetId,
    publicPath: url,
    alt: altForAssetId(assetId),
  };
}

/** 测试注入用：清索引缓存。 */
export function clearStoreBadgesIndexCache(): void {
  indexCache.index = null;
}
