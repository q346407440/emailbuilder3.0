import { createDefaultAssetResolver } from "../assetResolve";
import type { AssetSlotsBlueprint, ManualRestoreBlueprint, ResolvedManualRestoreAssets } from "./types";

export async function resolveBlueprintAssets(
  blueprint: AssetSlotsBlueprint | Pick<ManualRestoreBlueprint, "imageSlots" | "iconSlots">
): Promise<ResolvedManualRestoreAssets> {
  const resolver = createDefaultAssetResolver();
  const images: ResolvedManualRestoreAssets["images"] = {};
  const icons: ResolvedManualRestoreAssets["icons"] = {};

  const [imageOutcomes, iconOutcomes] = await Promise.all([
    Promise.all(
      blueprint.imageSlots.map(async (slot) => {
        const result = await resolver.resolve({
          kind: "pexels-photo",
          query: slot.query,
          targetWidth: slot.targetWidth ?? 600,
        });
        return { slot, result };
      })
    ),
    Promise.all(
      blueprint.iconSlots.map(async (slot) => {
        const result = await resolver.resolve({
          kind: "icon-cdn",
          pack: slot.pack,
          iconQuery: slot.iconQuery,
        });
        return { slot, result };
      })
    ),
  ]);

  for (const { slot, result } of imageOutcomes) {
    if (result.ok) {
      images[slot.slotId] = { url: result.url, alt: result.alt ?? slot.query };
    } else {
      console.warn(`[manual-restore] Pexels 失败 ${slot.slotId}: ${result.reason}`);
    }
  }

  for (const { slot, result } of iconOutcomes) {
    if (result.ok) {
      icons[slot.slotId] = {
        url: result.url,
        colorHex: slot.colorHex ?? "#000000",
        tintable: result.tintable,
      };
    } else {
      console.warn(`[manual-restore] Icon 失败 ${slot.slotId}: ${result.reason}`);
    }
  }

  return { images, icons };
}
