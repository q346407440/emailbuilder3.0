import { z } from "zod";
import { PIPELINE_IR_SCHEMA_VERSION, TEXT_EXTRACT_ROLES } from "../compactTypes";

const textRunSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

const textParagraphSchema = z.object({
  runs: z.array(textRunSchema).min(1),
});

const textBodySchema = z.object({
  paragraphs: z.array(textParagraphSchema).min(1),
});

const textExtractParagraphSchema = z.object({
  textId: z.string().min(1),
  role: z.enum(TEXT_EXTRACT_ROLES),
  textBody: textBodySchema,
});

/** 管线内部文案提取形态（由 normalizeTextExtractFromLlm 从 LLM `[{ regionId, texts[] }]` 派生）。 */
export const textExtractPayloadSchema = z.object({
  regions: z.array(
    z.object({
      regionId: z.string().min(1),
      paragraphs: z.array(textExtractParagraphSchema),
    })
  ),
});

export const textExtractResultSchema = textExtractPayloadSchema.extend({
  schemaVersion: z.literal(PIPELINE_IR_SCHEMA_VERSION),
});

export type TextExtractPayloadParsed = z.infer<typeof textExtractPayloadSchema>;
export type TextExtractResultParsed = z.infer<typeof textExtractResultSchema>;
