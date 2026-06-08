import type {
  ImageCardImageTier,
  ImageHeroLayoutTier,
  ImageSlotRole,
} from "../../../layout-variant-ai-contract/compactIr";
import { resolveCardImageHeight } from "../../../layout-variant-ai-contract/compactIr";
import { normalizeImageContainerHeightPx } from "../../../layout-variant-ai-contract/imageContainerHeight";
import type { ImageWrapperGridContext } from "../imageWrapperDefaults";
import type { CompactNode } from "../types";

export type ImageContainerPreset = {
  widthMode: "fill" | "hug" | "fixed";
  heightMode: "fill" | "hug" | "fixed";
  width?: string;
  height?: string;
  backgroundImageFit: "cover" | "contain";
};

const HERO_HEIGHT_BY_TIER: Record<ImageHeroLayoutTier, string> = {
  compact: "200px",
  standard: "280px",
  tall: "360px",
};

const LOGO_BOX = { width: "160px", height: "40px" } as const;
const BACKGROUND_HEIGHT = "180px";

function inferRoleFallback(
  gridCtx?: ImageWrapperGridContext,
  hasOverlay?: boolean
): ImageSlotRole {
  if (gridCtx) return "card";
  if (hasOverlay) return "hero";
  return "hero";
}

function resolveCardImageFixedHeight(input: {
  gridCtx?: ImageWrapperGridContext;
  cardImageTier?: ImageCardImageTier;
}): string {
  const gridFixed =
    input.gridCtx?.cellHeightMode === "fixed" && input.gridCtx.cellHeight?.trim()
      ? input.gridCtx.cellHeight.trim()
      : undefined;
  if (gridFixed) return gridFixed;
  return resolveCardImageHeight(input.cardImageTier);
}

/** D-BOX-2：优先 Stage A containerHeight；否则 role/档位查表；剥离 C 误写的容器 px。 */
export function resolveImageContainerPreset(input: {
  role?: ImageSlotRole;
  layoutTier?: ImageHeroLayoutTier;
  /** Stage A 直接给出的容器高（如 280px），clamp 后优先于档位表。 */
  containerHeight?: string;
  gridCtx?: ImageWrapperGridContext;
  cardImageTier?: ImageCardImageTier;
  sectionHasOverlay?: boolean;
}): ImageContainerPreset {
  const role = input.role ?? inferRoleFallback(input.gridCtx, input.sectionHasOverlay);
  const aiHeight = normalizeImageContainerHeightPx(input.containerHeight);
  if (aiHeight) {
    const fit =
      role === "logo" ? "contain" : ("cover" as const);
    if (role === "logo") {
      return {
        widthMode: "fixed",
        heightMode: "fixed",
        width: LOGO_BOX.width,
        height: aiHeight,
        backgroundImageFit: fit,
      };
    }
    return {
      widthMode: "fill",
      heightMode: "fixed",
      height: aiHeight,
      backgroundImageFit: fit,
    };
  }

  switch (role) {
    case "logo":
      return {
        widthMode: "fixed",
        heightMode: "fixed",
        width: LOGO_BOX.width,
        height: LOGO_BOX.height,
        backgroundImageFit: "contain",
      };
    case "card": {
      const height = resolveCardImageFixedHeight(input);
      return {
        widthMode: "fill",
        heightMode: "fixed",
        height,
        backgroundImageFit: "cover",
      };
    }
    case "background":
      return {
        widthMode: "fill",
        heightMode: "fixed",
        height: BACKGROUND_HEIGHT,
        backgroundImageFit: "cover",
      };
    case "hero":
    default: {
      const tier = input.layoutTier ?? "standard";
      return {
        widthMode: "fill",
        heightMode: "fixed",
        height: HERO_HEIGHT_BY_TIER[tier] ?? HERO_HEIGHT_BY_TIER.standard,
        backgroundImageFit: "cover",
      };
    }
  }
}

/** 将预设写入 content.image compact wrapper（保留 backgroundImageRef；剥离 C 误写 px）。 */
export function applyImageContainerPresetToWrapper(
  wrapper: CompactNode["wrapper"] | undefined,
  preset: ImageContainerPreset
): NonNullable<CompactNode["wrapper"]> {
  const ref = wrapper?.backgroundImageRef;
  return {
    backgroundImageRef: ref,
    widthMode: preset.widthMode,
    heightMode: preset.heightMode,
    ...(preset.width ? { width: preset.width } : {}),
    ...(preset.height ? { height: preset.height } : {}),
    ...(wrapper?.padding ? { padding: wrapper.padding } : {}),
    ...(wrapper?.contentAlign ? { contentAlign: wrapper.contentAlign } : {}),
    ...(wrapper?.backgroundColor ? { backgroundColor: wrapper.backgroundColor } : {}),
    ...(wrapper?.borderRadius ? { borderRadius: wrapper.borderRadius } : {}),
  };
}
