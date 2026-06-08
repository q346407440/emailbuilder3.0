import { z } from "zod";
import { ICON_PACKS } from "../compactTypes";
import { HEX_COLOR_RE } from "./shared";

export const iconQueryItemSchema = z.object({
  id: z.string().min(1),
  regionId: z.string().min(1),
  pack: z.enum(ICON_PACKS),
  iconQuery: z.string().min(1),
  colorHex: z.string().regex(HEX_COLOR_RE),
  label: z.string().optional(),
});

export const iconQueryListSchema = z.array(iconQueryItemSchema);

export type IconQueryItemParsed = z.infer<typeof iconQueryItemSchema>;
