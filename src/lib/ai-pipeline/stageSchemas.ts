import { groundingResultSchema } from "./schemas/a-grounding";
import { styleTokensResultSchema } from "./schemas/b1-style-tokens";
import { iconQueryListSchema } from "./schemas/b2-icon-query";
import { textExtractResultSchema } from "./schemas/b3-text-extract";
import { compactSectionTreeSchema } from "./schemas/compact-section";
import { schemaToJsonSchema } from "./schemas/shared";
import type { LlmResponseFormat } from "./ports/LlmClient";

export type PipelineLlmStage = "A" | "B1" | "B2" | "B3" | "C";

const STAGE_SCHEMA = {
  A: { schema: groundingResultSchema, name: "grounding_result_v1" },
  B1: { schema: styleTokensResultSchema, name: "style_tokens_v1" },
  B2: { schema: iconQueryListSchema, name: "icon_query_list_v1" },
  B3: { schema: textExtractResultSchema, name: "text_extract_v1" },
  C: { schema: compactSectionTreeSchema, name: "compact_section_tree_v1" },
} as const;

export function getResponseFormatForStage(stage: PipelineLlmStage): LlmResponseFormat {
  const entry = STAGE_SCHEMA[stage];
  return {
    type: "json_schema",
    json_schema: {
      name: entry.name,
      strict: true,
      schema: schemaToJsonSchema(entry.schema, entry.name),
    },
  };
}
