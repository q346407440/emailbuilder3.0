import {
  COMPACT_SCHEMA_VERSION,
  PIPELINE_IR_SCHEMA_VERSION,
} from "./compactTypes";
import type { GroundingPayloadParsed } from "./schemas/a-grounding";
import type { StyleTokensPayloadParsed } from "./schemas/b1-style-tokens";
import type { TextExtractPayloadParsed } from "./schemas/b3-text-extract";
import type { CompactSectionRootPayloadParsed } from "./schemas/compact-section";
import type {
  CompactSectionTree,
  GroundingResult,
  StyleTokensResult,
  TextExtractResult,
} from "./types";

export type GroundingPayload = GroundingPayloadParsed;
export type StyleTokensPayload = StyleTokensPayloadParsed;
export type TextExtractPayload = TextExtractPayloadParsed;
export type CompactSectionRootPayload = CompactSectionRootPayloadParsed;

/** 阶段 A：LLM 只产出 order/sections，版本由管线注入。 */
export function injectGroundingResult(payload: GroundingPayload): GroundingResult {
  return { schemaVersion: PIPELINE_IR_SCHEMA_VERSION, ...payload };
}

/** 阶段 B1：LLM 只产出 tokens/canvas。 */
export function injectStyleTokensResult(payload: StyleTokensPayload): StyleTokensResult {
  return { schemaVersion: PIPELINE_IR_SCHEMA_VERSION, ...payload };
}

/** 阶段 B3：LLM 只产出 regions。 */
export function injectTextExtractResult(payload: TextExtractPayload): TextExtractResult {
  return { schemaVersion: PIPELINE_IR_SCHEMA_VERSION, ...payload };
}

/** 阶段 C：LLM 只产出 root，sectionId 与 compact 版本由管线注入。 */
export function injectCompactSectionTree(
  sectionId: string,
  payload: CompactSectionRootPayload
): CompactSectionTree {
  return {
    compactSchemaVersion: COMPACT_SCHEMA_VERSION,
    sectionId,
    root: payload.root,
  };
}
