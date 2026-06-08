import { z } from "zod";
import {
  B1_RADIUS_TIER_ENUMS,
  B1_SPACING_TIER_ENUMS,
  B1_TYPOGRAPHY_TIER_ENUMS,
} from "../b1StyleTierPresets";
import { PIPELINE_IR_SCHEMA_VERSION } from "../compactTypes";
import { HEX_COLOR_RE } from "./shared";

const styleTokensFieldsSchema = z.object({
  tokens: z.object({
    colors: z.object({
      primary: z.string().regex(HEX_COLOR_RE),
      secondary: z.string().regex(HEX_COLOR_RE),
      surface: z.string().regex(HEX_COLOR_RE),
    }),
    spacing: z.object({
      section: z.enum(B1_SPACING_TIER_ENUMS.section),
      gap: z.enum(B1_SPACING_TIER_ENUMS.gap),
      pageInline: z.enum(B1_SPACING_TIER_ENUMS.pageInline),
    }),
    typography: z.object({
      display: z.enum(B1_TYPOGRAPHY_TIER_ENUMS.display),
      h1: z.enum(B1_TYPOGRAPHY_TIER_ENUMS.h1),
      body: z.enum(B1_TYPOGRAPHY_TIER_ENUMS.body),
      caption: z.enum(B1_TYPOGRAPHY_TIER_ENUMS.caption),
    }),
    radius: z.object({
      panel: z.enum(B1_RADIUS_TIER_ENUMS.panel),
      cta: z.enum(B1_RADIUS_TIER_ENUMS.cta),
    }),
  }),
  canvas: z.object({
    width: z.string(),
    emailBackground: z.string().regex(HEX_COLOR_RE),
    contentSurface: z.string().regex(HEX_COLOR_RE),
  }),
});

/** 管线内部 B1 形态（由 normalizeStyleTokensFromLlm 派生；LLM 输出 preset + hex）。 */
export const styleTokensPayloadSchema = styleTokensFieldsSchema;

export const styleTokensResultSchema = styleTokensFieldsSchema.extend({
  schemaVersion: z.literal(PIPELINE_IR_SCHEMA_VERSION),
});

export type StyleTokensPayloadParsed = z.infer<typeof styleTokensPayloadSchema>;
export type StyleTokensResultParsed = z.infer<typeof styleTokensResultSchema>;
