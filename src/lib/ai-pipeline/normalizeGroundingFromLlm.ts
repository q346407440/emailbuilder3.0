import type { GroundingPayloadParsed } from "./schemas/a-grounding";
import type { GroundingSection, ImageSlotSpec } from "./types";
import { imageSlotId } from "./groundingImage";
import type { ImageCardImageTier } from "../../layout-variant-ai-contract/compactIr";
import {
  IMAGE_CARD_IMAGE_TIERS,
  IMAGE_HERO_LAYOUT_TIERS,
  IMAGE_SLOT_ROLES,
} from "../../layout-variant-ai-contract/compactIr";
import { normalizeImageContainerHeightPx } from "../../layout-variant-ai-contract/imageContainerHeight";
import { SECTION_ROOT_PADDING_MAX_PX } from "./compile/sectionRootSpacing";
import { parsePxValue } from "./b1StyleTierPresets";

const MAX_SECTIONS = 12;

function normalizeGapHint(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const px = parsePxValue(raw.trim());
  if (px <= 0) return undefined;
  const clamped = Math.min(SECTION_ROOT_PADDING_MAX_PX, Math.round(px));
  return `${clamped}px`;
}

type LlmImageSlotItem = {
  slotId?: unknown;
  imageQuery?: unknown;
  role?: unknown;
  layoutTier?: unknown;
  containerHeight?: unknown;
  imageWidth?: unknown;
  imageHeight?: unknown;
};

/** LLM Stage A 输出的单条区域（JSON 数组元素）。 */
type LlmGroundingItem = {
  id?: string;
  region?: string;
  name?: string;
  components?: string;
  layoutHints?: {
    fullWidth?: boolean;
    align?: string;
    gridColumns?: number;
    gapAbove?: string;
    gapBelow?: string;
    cardImageTier?: string;
  };
  hints?: Record<string, unknown>;
  hasImage?: boolean;
  imageQuery?: string;
  imageSlots?: unknown;
  imageWidth?: number;
  imageHeight?: number;
  hasOverlay?: boolean;
  overlayAlign?: string;
  overlayItems?: string;
};

/** 将 LLM 输出的 JSON 数组规范化为管线内部 GroundingPayload（含 order/sections）。 */
export function normalizeGroundingFromLlm(parsed: unknown): GroundingPayloadParsed | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return normalizeGroundingArray(parsed);
}

function normalizeGroundingArray(items: unknown[]): GroundingPayloadParsed {
  const sections: GroundingSection[] = items.slice(0, MAX_SECTIONS).map((raw, index) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as LlmGroundingItem;
    const sectionId = pickSectionId(item, index);
    const name = (item.region ?? item.name ?? `区域${index + 1}`).trim() || `区域${index + 1}`;

    const components =
      typeof item.components === "string" && item.components.trim()
        ? item.components.trim()
        : undefined;

    const section: GroundingSection = {
      sectionId,
      name,
      order: index,
      ...(components ? { components } : {}),
    };

    if (item.layoutHints && typeof item.layoutHints === "object") {
      const lh = item.layoutHints;
      section.layoutHints = {
        ...(typeof lh.fullWidth === "boolean" ? { fullWidth: lh.fullWidth } : {}),
        ...(typeof lh.gridColumns === "number" && lh.gridColumns > 0
          ? { gridColumns: lh.gridColumns }
          : {}),
        ...(lh.align === "left" || lh.align === "center" || lh.align === "right"
          ? { align: lh.align }
          : {}),
        ...(normalizeGapHint(lh.gapAbove) ? { gapAbove: normalizeGapHint(lh.gapAbove) } : {}),
        ...(normalizeGapHint(lh.gapBelow) ? { gapBelow: normalizeGapHint(lh.gapBelow) } : {}),
        ...normalizeCardImageTierHint(lh.cardImageTier),
      };
      if (Object.keys(section.layoutHints).length === 0) delete section.layoutHints;
    }

    if (item.hasOverlay === true) section.hasOverlay = true;

    applyImageFields(section, item);
    applyLogoSlotPolicy(section);
    ensureCardImageTierDefault(section);

    return section;
  });

  return {
    order: sections.map((s) => s.sectionId),
    sections,
  };
}

function normalizeCardImageTierHint(raw: unknown): { cardImageTier: ImageCardImageTier } | Record<string, never> {
  const tier = typeof raw === "string" ? raw.trim() : "";
  if (!IMAGE_CARD_IMAGE_TIERS.includes(tier as ImageCardImageTier)) return {};
  return { cardImageTier: tier as ImageCardImageTier };
}

function sectionHasCardImageSlots(section: GroundingSection): boolean {
  return section.imageSlots?.some((s) => s.role === "card") ?? false;
}

/** 含 card 配图、且各 slot 均无 containerHeight 时，才用旧版 cardImageTier 兜底。 */
function ensureCardImageTierDefault(section: GroundingSection): void {
  const slots = section.imageSlots ?? [];
  if (slots.some((s) => s.containerHeight)) return;
  if (!sectionHasCardImageSlots(section)) return;
  section.layoutHints = { ...(section.layoutHints ?? {}), cardImageTier: section.layoutHints?.cardImageTier ?? "standard" };
}

/** 剔除 role=logo 的 imageSlots；logo 不走 Pexels，由 B3 文案或 B2 图标承载。 */
function applyLogoSlotPolicy(section: GroundingSection): void {
  if (!section.imageSlots?.length) return;
  const pexelsSlots = section.imageSlots.filter((s) => s.role !== "logo");
  if (pexelsSlots.length === section.imageSlots.length) return;

  if (pexelsSlots.length === 0) {
    delete section.imageSlots;
    section.hasImage = false;
    delete section.imageQuery;
    delete section.imageWidth;
    delete section.imageHeight;
    return;
  }

  section.imageSlots = pexelsSlots;
  section.hasImage = true;
  section.imageQuery = pexelsSlots[0]?.imageQuery;
  section.imageWidth = pexelsSlots[0]?.imageWidth;
  section.imageHeight = pexelsSlots[0]?.imageHeight;
}

function pickSectionId(item: LlmGroundingItem, index: number): string {
  const id = (item.id ?? "").trim();
  return id || `s${index + 1}`;
}

function normalizeLlmImageSlot(
  raw: LlmImageSlotItem,
  sectionId: string,
  index: number
): ImageSlotSpec | null {
  const imageQuery = typeof raw.imageQuery === "string" ? raw.imageQuery.trim() : "";
  if (!imageQuery) return null;
  const slotIdRaw = typeof raw.slotId === "string" ? raw.slotId.trim() : "";
  const roleRaw = typeof raw.role === "string" ? raw.role.trim() : "";
  const tierRaw = typeof raw.layoutTier === "string" ? raw.layoutTier.trim() : "";
  return {
    slotId: slotIdRaw || imageSlotId(sectionId, index),
    imageQuery,
    ...(IMAGE_SLOT_ROLES.includes(roleRaw as (typeof IMAGE_SLOT_ROLES)[number])
      ? { role: roleRaw as ImageSlotSpec["role"] }
      : {}),
    ...(IMAGE_HERO_LAYOUT_TIERS.includes(tierRaw as (typeof IMAGE_HERO_LAYOUT_TIERS)[number])
      ? { layoutTier: tierRaw as ImageSlotSpec["layoutTier"] }
      : {}),
    ...(typeof raw.imageWidth === "number" && raw.imageWidth > 0
      ? { imageWidth: raw.imageWidth }
      : {}),
    ...(typeof raw.imageHeight === "number" && raw.imageHeight > 0
      ? { imageHeight: raw.imageHeight }
      : {}),
    ...(normalizeImageContainerHeightPx(raw.containerHeight)
      ? { containerHeight: normalizeImageContainerHeightPx(raw.containerHeight) }
      : {}),
  };
}

function applyImageFields(section: GroundingSection, item: LlmGroundingItem): void {
  const slots: ImageSlotSpec[] = [];
  if (Array.isArray(item.imageSlots)) {
    for (const raw of item.imageSlots) {
      if (!raw || typeof raw !== "object") continue;
      const slot = normalizeLlmImageSlot(raw as LlmImageSlotItem, section.sectionId, slots.length);
      if (slot) slots.push(slot);
    }
  }

  if (slots.length === 0) {
    const query = typeof item.imageQuery === "string" ? item.imageQuery.trim() : "";
    if (item.hasImage !== true && !query) return;
    slots.push({
      slotId: imageSlotId(section.sectionId, 0),
      imageQuery: query || "email marketing photo",
      ...(typeof item.imageWidth === "number" && item.imageWidth > 0
        ? { imageWidth: item.imageWidth }
        : {}),
      ...(typeof item.imageHeight === "number" && item.imageHeight > 0
        ? { imageHeight: item.imageHeight }
        : {}),
    });
  }

  section.hasImage = true;
  section.imageSlots = slots;
  section.imageQuery = slots[0]?.imageQuery;
  section.imageWidth = slots[0]?.imageWidth;
  section.imageHeight = slots[0]?.imageHeight;
}

/** Stage A 失败降级：代码构造的单区 GroundingPayload（非 LLM 形态）。 */
export function singleSectionGroundingPayload(): GroundingPayloadParsed {
  return {
    order: ["s1"],
    sections: [
      {
        sectionId: "s1",
        name: "主内容",
        order: 0,
        hasImage: true,
        imageQuery: "email marketing banner",
        imageSlots: [
          {
            slotId: imageSlotId("s1", 0),
            imageQuery: "email marketing banner",
            imageWidth: 600,
            imageHeight: 280,
          },
        ],
      },
    ],
  };
}
