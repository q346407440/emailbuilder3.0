import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type IconCdnIndex = {
  pack: string;
  version: string;
  cdnBase: string;
  slugs: string[];
  aliases?: Record<string, string>;
  fallbackSlug?: string;
};

export type IconCdnResolveResult = {
  src: string;
  tintable: boolean;
  resolvedSlug: string;
  usedFallback: boolean;
};


const indexCache = new Map<string, IconCdnIndex>();

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../..");
}

function loadIconIndex(pack: "simple-icons" | "tabler" | "lucide"): IconCdnIndex {
  const cached = indexCache.get(pack);
  if (cached) return cached;
  const fileName =
    pack === "simple-icons" ? "simple-icons-index.json" : `${pack}-icons-index.json`;
  const indexPath = path.join(repoRoot(), "data/icon-cdn", fileName);
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as IconCdnIndex;
  indexCache.set(pack, index);
  return index;
}

export function normalizeIconSlug(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "-");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/** 在索引内解析 slug：精确 → 别名 → 去数字后缀 → 前缀/包含 → 小编集编辑距离 → fallback。 */
export function resolveSlugInIconIndex(
  rawQuery: string,
  index: IconCdnIndex
): { slug: string; usedFallback: boolean } {
  const slugSet = new Set(index.slugs);
  const fallback = index.fallbackSlug?.trim() || "photo";
  const slug = normalizeIconSlug(rawQuery);

  if (!slug) {
    return { slug: slugSet.has(fallback) ? fallback : index.slugs[0] ?? fallback, usedFallback: true };
  }

  const tryExact = (candidate: string): string | null =>
    slugSet.has(candidate) ? candidate : null;

  let hit = tryExact(slug);
  if (hit) return { slug: hit, usedFallback: false };

  const aliased = index.aliases?.[slug];
  if (aliased) {
    hit = tryExact(aliased);
    if (hit) return { slug: hit, usedFallback: false };
  }

  const strippedNum = slug.replace(/-\d+$/, "");
  if (strippedNum !== slug) {
    hit = tryExact(strippedNum);
    if (hit) return { slug: hit, usedFallback: false };
  }

  const prefixCandidates = index.slugs.filter(
    (s) => s.startsWith(slug) || slug.startsWith(s)
  );
  if (prefixCandidates.length === 1) {
    return { slug: prefixCandidates[0], usedFallback: false };
  }
  if (prefixCandidates.length > 1) {
    prefixCandidates.sort(
      (a, b) => Math.abs(a.length - slug.length) - Math.abs(b.length - slug.length)
    );
    return { slug: prefixCandidates[0], usedFallback: false };
  }

  if (slug.length >= 4) {
    const contains = index.slugs.filter((s) => s.includes(slug) || slug.includes(s));
    if (contains.length === 1) {
      return { slug: contains[0], usedFallback: false };
    }
    if (contains.length > 1) {
      contains.sort(
        (a, b) => Math.abs(a.length - slug.length) - Math.abs(b.length - slug.length)
      );
      return { slug: contains[0], usedFallback: false };
    }
  }

  const prefix3 = slug.slice(0, 3);
  if (prefix3.length >= 3) {
    const pool = index.slugs.filter((s) => s.startsWith(prefix3));
    if (pool.length > 0 && pool.length <= 400) {
      let best: string | null = null;
      let bestDist = 3;
      for (const s of pool) {
        const d = levenshtein(slug, s);
        if (d < bestDist) {
          bestDist = d;
          best = s;
        }
      }
      if (best && bestDist <= 2) {
        return { slug: best, usedFallback: false };
      }
    }
  }

  if (slugSet.has(fallback)) {
    return { slug: fallback, usedFallback: true };
  }
  return { slug: index.slugs[0] ?? fallback, usedFallback: true };
}

export function resolveIconCdnUrl(
  pack: string,
  iconQuery: string
): IconCdnResolveResult | null {
  const slug = normalizeIconSlug(iconQuery);
  if (!slug) return null;

  switch (pack) {
    case "simple-icons": {
      const index = loadIconIndex("simple-icons");
      const { slug: resolved, usedFallback } = resolveSlugInIconIndex(slug, index);
      if (!index.slugs.includes(resolved)) return null;
      return {
        src: `${index.cdnBase}/${resolved}.svg`,
        tintable: false,
        resolvedSlug: resolved,
        usedFallback,
      };
    }
    case "tabler": {
      const index = loadIconIndex("tabler");
      const { slug: resolved, usedFallback } = resolveSlugInIconIndex(slug, index);
      return {
        src: `${index.cdnBase}/${resolved}.svg`,
        tintable: true,
        resolvedSlug: resolved,
        usedFallback,
      };
    }
    case "lucide": {
      const index = loadIconIndex("lucide");
      const { slug: resolved, usedFallback } = resolveSlugInIconIndex(slug, index);
      return {
        src: `${index.cdnBase}/${resolved}.svg`,
        tintable: true,
        resolvedSlug: resolved,
        usedFallback,
      };
    }
    default:
      return null;
  }
}

export function listSimpleIconSlugsForPrompt(limit = 20): string[] {
  const index = loadIconIndex("simple-icons");
  return index.slugs.slice(0, limit);
}

export function listTablerIconSlugsForPrompt(limit = 30): string[] {
  const index = loadIconIndex("tabler");
  const preferred = [
    "package",
    "truck",
    "arrow-back-up",
    "infinity",
    "map-pin",
    "device-mobile",
    "building-store",
    "mail",
    "phone",
    "star",
    "heart",
    "check",
    "photo",
  ];
  const picked = preferred.filter((s) => index.slugs.includes(s));
  if (picked.length >= limit) return picked.slice(0, limit);
  return [...picked, ...index.slugs.filter((s) => !picked.includes(s))].slice(0, limit);
}
