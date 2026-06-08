import type { AssetResolver, AssetResolveInput, AssetResolveResult } from "./ports/AssetResolver";
import { AI_PIPELINE_PLACEHOLDER_IMAGE_URL } from "./constants";
import {
  imageSearchTargetWidth,
  inferSearchOrientation,
  listPexelsImageSlots,
} from "./groundingImage";
import type { GroundingResult, IconQueryItem, ImageResolved } from "./types";
import {
  logB4PexelsAllFailedIfNeeded,
  logB4PexelsSummary,
  type PexelsSlotResolveMeta,
} from "./logB4PexelsFailures";

/** 并行解析同质资产任务（图片 / 图标共用）。 */
export async function parallelResolveAssets<T, R>(
  items: readonly T[],
  resolveOne: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  return Promise.all(items.map((item) => resolveOne(item)));
}

async function resolveWithResolver(
  resolver: AssetResolver,
  input: AssetResolveInput
): Promise<AssetResolveResult> {
  return resolver.resolve(input);
}

export async function resolveGroundingImages(
  grounding: GroundingResult,
  resolver: AssetResolver
): Promise<{ resolved: ImageResolved[]; images: Record<string, { url: string; alt?: string; fit?: string; position?: string }> }> {
  const slotTasks: Array<{ sectionId: string; slot: ReturnType<typeof listPexelsImageSlots>[number] }> =
    [];
  for (const section of grounding.sections) {
    for (const slot of listPexelsImageSlots(section)) {
      slotTasks.push({ sectionId: section.sectionId, slot });
    }
  }

  const resolved = await parallelResolveAssets(slotTasks, async ({ sectionId, slot }) => {
    const query = slot.imageQuery.trim();
    const targetWidth = imageSearchTargetWidth(slot.imageWidth);
    const orientation = inferSearchOrientation(slot.imageWidth, slot.imageHeight);

    const result = await resolveWithResolver(resolver, {
      kind: "pexels-photo",
      query,
      orientation,
      targetWidth,
    });

    if (!result.ok) {
      return {
        slotId: slot.slotId,
        regionId: sectionId,
        url: AI_PIPELINE_PLACEHOLDER_IMAGE_URL,
        alt: query,
        pexelsOk: false,
        failReason: result.reason,
        failDetail: result.detail,
        imageQuery: query,
      } satisfies PexelsSlotResolveMeta;
    }

    return {
      slotId: slot.slotId,
      regionId: sectionId,
      url: result.url,
      alt: result.alt ?? query,
      pexelsOk: true,
      imageQuery: query,
    } satisfies PexelsSlotResolveMeta;
  });

  logB4PexelsSummary(resolved);
  logB4PexelsAllFailedIfNeeded(resolved);

  const images: Record<string, { url: string; alt?: string; fit?: string; position?: string }> =
    {};
  for (const item of resolved) {
    images[item.slotId] = {
      url: item.url,
      alt: item.alt,
      fit: "cover",
      position: "center",
    };
  }

  const resolvedPublic: ImageResolved[] = resolved.map(
    ({ slotId, regionId, url, alt }) => ({ slotId, regionId, url, alt })
  );

  return { resolved: resolvedPublic, images };
}

export async function resolveIconQueries(
  queries: IconQueryItem[],
  resolver: AssetResolver
): Promise<Record<string, { src: string; colorHex: string; tintable?: boolean }>> {
  const icons: Record<string, { src: string; colorHex: string; tintable?: boolean }> = {};

  const results = await parallelResolveAssets(queries, async (q) => {
    const result = await resolveWithResolver(resolver, {
      kind: "icon-cdn",
      pack: q.pack,
      iconQuery: q.iconQuery,
    });
    return { id: q.id, query: q, result };
  });

  for (const { id, query, result } of results) {
    if (!result.ok) continue;
    icons[id] = {
      src: result.url,
      colorHex: query.colorHex,
      tintable: result.tintable,
    };
  }

  return icons;
}
