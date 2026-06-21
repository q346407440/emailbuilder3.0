/**
 * Pexels 图片搜索（管线阶段 B4 · 真实配图）。
 * API 文档：https://www.pexels.com/api/documentation/#photos-search
 *
 * 自 handoff `pexelsClient.ts` 迁入核心 HTTP 能力；Easy-Email 无 PostgreSQL 图片库，
 * 不提供 searchWithCache 的本地库 / 随机兜底，仅 Pexels API + 空结果。
 */

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const PEXELS_FETCH_TIMEOUT_MS = 8_000;

export type PexelsOrientation = "landscape" | "portrait" | "square";

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  alt: string;
  src: {
    original: string;
    large: string;
    large2x: string;
    medium: string;
    small: string;
    landscape: string;
    tiny: string;
  };
  photographer: string;
};

type PexelsSearchResult = {
  photos: PexelsPhoto[];
  total_results: number;
};

export type PexelsImageMatch = {
  url: string;
  alt: string;
  photographer: string;
};

export type PexelsFailureReason =
  | "PEXELS_API_KEY_MISSING"
  | "PEXELS_HTTP_ERROR"
  | "PEXELS_FETCH_ERROR"
  | "PEXELS_EMPTY_RESULTS";

export type PexelsSearchOutcome =
  | { ok: true; photos: PexelsPhoto[] }
  | { ok: false; reason: PexelsFailureReason; detail?: string };

export function isPexelsApiKeyConfigured(): boolean {
  return Boolean((process.env.PEXELS_API_KEY ?? "").trim());
}

/**
 * 按关键词搜索 Pexels，返回最多 perPage 张。
 * 未配置 PEXELS_API_KEY 时 ok:false（不抛错，便于管线降级）。
 */
export async function searchPexels(
  query: string,
  options: { perPage?: number; orientation?: PexelsOrientation } = {}
): Promise<PexelsSearchOutcome> {
  const apiKey = (process.env.PEXELS_API_KEY ?? "").trim();
  if (!apiKey) {
    console.warn("[pexels] 未设置 PEXELS_API_KEY，跳过搜索");
    return { ok: false, reason: "PEXELS_API_KEY_MISSING" };
  }

  const { perPage = 3, orientation } = options;
  const params = new URLSearchParams({
    query: query.trim(),
    per_page: String(perPage),
  });
  if (orientation) params.set("orientation", orientation);

  try {
    const res = await fetch(`${PEXELS_SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(PEXELS_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[pexels] 搜索失败: ${res.status} ${res.statusText}`);
      return {
        ok: false,
        reason: "PEXELS_HTTP_ERROR",
        detail: `${res.status} ${res.statusText}`,
      };
    }

    const data = (await res.json()) as PexelsSearchResult;
    const photos = data.photos ?? [];
    if (photos.length === 0) {
      return { ok: false, reason: "PEXELS_EMPTY_RESULTS" };
    }
    return { ok: true, photos };
  } catch (err) {
    console.warn("[pexels] 搜索异常:", err);
    return {
      ok: false,
      reason: "PEXELS_FETCH_ERROR",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** 挑选写入模板的 Pexels 直链。本项目只贴 URL 不下载，统一用 original 避免小档被 CSS 放大发糊。 */
export function pickPexelsSrc(photo: PexelsPhoto, _targetWidth?: number): string {
  return photo.src.original;
}

export type PexelsBestOutcome =
  | { ok: true; match: PexelsImageMatch }
  | { ok: false; reason: PexelsFailureReason; detail?: string };

export type PexelsCandidatesOutcome =
  | { ok: true; matches: PexelsImageMatch[] }
  | { ok: false; reason: PexelsFailureReason; detail?: string };

/** 将一张 Pexels 照片按目标宽度挑档后归一为 match。 */
function toPexelsMatch(
  photo: PexelsPhoto,
  targetWidth: number,
  query: string
): PexelsImageMatch {
  return {
    url: pickPexelsSrc(photo, targetWidth),
    alt: photo.alt || query,
    photographer: photo.photographer,
  };
}

/**
 * 搜索并返回多张候选（按目标宽度挑档），供调用方逐个验活、不可访问则取下一张。
 * 命中顺序即 Pexels 相关度顺序。
 */
export async function searchPexelsCandidates(
  query: string,
  targetWidth: number,
  limit: number,
  orientation?: PexelsOrientation
): Promise<PexelsCandidatesOutcome> {
  const outcome = await searchPexels(query, { perPage: limit, orientation });
  if (!outcome.ok) {
    return { ok: false, reason: outcome.reason, detail: outcome.detail };
  }
  return {
    ok: true,
    matches: outcome.photos.map((photo) => toPexelsMatch(photo, targetWidth, query)),
  };
}

/**
 * 搜索并返回最佳一张（供以图还原管线 / 占位图填充）。
 * 与 handoff `searchWithCache` 的 Pexels 分支等价，无本地库兜底。
 */
export async function searchPexelsBest(
  query: string,
  targetWidth: number,
  orientation?: PexelsOrientation
): Promise<PexelsBestOutcome> {
  const outcome = await searchPexels(query, { perPage: 1, orientation });
  if (!outcome.ok) {
    return { ok: false, reason: outcome.reason, detail: outcome.detail };
  }
  return { ok: true, match: toPexelsMatch(outcome.photos[0]!, targetWidth, query) };
}

/** 将英文搜索词拆分为关键词数组（分词去重，供扩展本地缓存时使用）。 */
export function parsePexelsQueryKeywords(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/[\s\-_,]+/).filter((w) => w.length > 1))];
}
