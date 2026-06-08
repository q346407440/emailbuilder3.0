import type { ImageOrientation } from "./compactTypes";
import { PEXELS_SEARCH_TARGET_WIDTH } from "./compactTypes";
import type { GroundingSection, ImageSlotSpec } from "./types";

/** 分区配图在 assetManifest 中的 slotId（第 index 张，从 0 起）。 */
export function imageSlotId(sectionId: string, index = 0): string {
  return `${sectionId}-img-${index}`;
}

/** 从 Grounding 取出本区全部配图 slot（含 legacy 单 imageQuery 兼容）。 */
export function listImageSlots(section: GroundingSection): ImageSlotSpec[] {
  if (section.imageSlots?.length) {
    return section.imageSlots.map((slot, index) => ({
      ...slot,
      slotId: slot.slotId?.trim() || imageSlotId(section.sectionId, index),
    }));
  }
  if (section.hasImage && section.imageQuery?.trim()) {
    return [
      {
        slotId: imageSlotId(section.sectionId, 0),
        imageQuery: section.imageQuery.trim(),
        imageWidth: section.imageWidth,
        imageHeight: section.imageHeight,
      },
    ];
  }
  return [];
}

/** role=logo 的 slot 不走 Pexels（品牌 Logo 由 B3 文案或 B2 图标承载）。 */
export function isPexelsImageSlot(slot: ImageSlotSpec): boolean {
  return slot.role !== "logo";
}

/** 参与 B4 Pexels 搜图的配图 slot（排除 logo）。 */
export function listPexelsImageSlots(section: GroundingSection): ImageSlotSpec[] {
  return listImageSlots(section).filter(isPexelsImageSlot);
}

export function inferSearchOrientation(
  imageWidth?: number,
  imageHeight?: number
): ImageOrientation | undefined {
  if (typeof imageWidth !== "number" || typeof imageHeight !== "number") {
    return undefined;
  }
  if (imageWidth > imageHeight) return "landscape";
  if (imageHeight > imageWidth) return "portrait";
  return "square";
}

/** Pexels 选档宽度：优先 A 阶段估宽，默认版心 600。 */
export function imageSearchTargetWidth(imageWidth?: number): number {
  if (typeof imageWidth === "number" && imageWidth > 0) return imageWidth;
  return PEXELS_SEARCH_TARGET_WIDTH;
}
