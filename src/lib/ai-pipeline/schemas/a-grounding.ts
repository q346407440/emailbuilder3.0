import { z } from "zod";
import { PIPELINE_IR_SCHEMA_VERSION, PRIMARY_ASSET_HINTS } from "../compactTypes";
import {
  IMAGE_CARD_IMAGE_TIERS,
  IMAGE_HERO_LAYOUT_TIERS,
  IMAGE_SLOT_ROLES,
} from "../../../layout-variant-ai-contract/compactIr";

const imageSlotSchema = z.object({
  slotId: z.string().min(1),
  imageQuery: z.string().min(1),
  role: z.enum(IMAGE_SLOT_ROLES).optional(),
  layoutTier: z.enum(IMAGE_HERO_LAYOUT_TIERS).optional(),
  containerHeight: z.string().min(1).optional(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
});

const groundingSectionSchema = z.object({
  sectionId: z.string().min(1),
  name: z.string(),
  order: z.number().int().nonnegative(),
  layoutHints: z
    .object({
      fullWidth: z.boolean().optional(),
      gridColumns: z.number().int().positive().optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      gapAbove: z.string().optional(),
      gapBelow: z.string().optional(),
      cardImageTier: z.enum(IMAGE_CARD_IMAGE_TIERS).optional(),
    })
    .optional(),
  hasOverlay: z.boolean().optional(),
  hasImage: z.boolean().optional(),
  imageQuery: z.string().min(1).optional(),
  imageSlots: z.array(imageSlotSchema).optional(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  assetHints: z
    .object({
      primaryAsset: z.enum(PRIMARY_ASSET_HINTS).optional(),
    })
    .optional(),
});

/** 管线内部 Grounding 形态（由 normalizeGroundingFromLlm 从 LLM JSON 数组派生；LLM 不直接输出此结构）。 */
export const groundingPayloadSchema = z.object({
  order: z.array(z.string().min(1)),
  sections: z.array(groundingSectionSchema),
});

export const groundingResultSchema = groundingPayloadSchema.extend({
  schemaVersion: z.literal(PIPELINE_IR_SCHEMA_VERSION),
});

export type GroundingPayloadParsed = z.infer<typeof groundingPayloadSchema>;
export type GroundingResultParsed = z.infer<typeof groundingResultSchema>;

export { groundingSectionSchema };
