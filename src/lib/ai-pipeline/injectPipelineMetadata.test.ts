import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groundingPayloadSchema } from "./schemas/a-grounding";
import { styleTokensPayloadSchema } from "./schemas/b1-style-tokens";
import { textExtractPayloadSchema } from "./schemas/b3-text-extract";
import {
  injectGroundingResult,
  injectStyleTokensResult,
  injectTextExtractResult,
} from "./injectPipelineMetadata";
import { normalizeGroundingFromLlm } from "./normalizeGroundingFromLlm";
import { normalizeTextExtractFromLlm } from "./normalizeTextExtractFromLlm";
import { AI_PIPELINE_B1_FALLBACK_TOKENS } from "./b1StyleTierPresets";

describe("injectPipelineMetadata", () => {
  it("A：LLM 数组 normalize 后注入 schemaVersion", () => {
    const payload = normalizeGroundingFromLlm([
      { id: "header", region: "页头", components: "logo" },
    ]);
    assert.ok(payload);
    const result = injectGroundingResult(payload);
    assert.equal(result.schemaVersion, "1");
    assert.deepEqual(result.order, ["header"]);
  });

  it("B1：tokens/canvas payload 注入 schemaVersion", () => {
    const payload = styleTokensPayloadSchema.parse({
      tokens: AI_PIPELINE_B1_FALLBACK_TOKENS,
      canvas: {
        width: "600px",
        emailBackground: "#F3F4F6",
        contentSurface: "#FFFFFF",
      },
    });
    const result = injectStyleTokensResult(payload);
    assert.equal(result.schemaVersion, "1");
  });

  it("B3：texts[] normalize 后注入 schemaVersion", () => {
    const payload = normalizeTextExtractFromLlm([
      { regionId: "s1", texts: ["Title", "Body copy"] },
    ]);
    const result = injectTextExtractResult(payload);
    assert.equal(result.schemaVersion, "1");
    assert.equal(result.regions.length, 1);
  });
});

describe("groundingPayloadSchema（管线内部形态）", () => {
  it("校验 normalize 派生的 order/sections", () => {
    const payload = groundingPayloadSchema.parse(
      normalizeGroundingFromLlm([{ id: "s1", region: "Hero", hasImage: true, imageQuery: "banner" }])
    );
    assert.equal(payload.sections[0]?.sectionId, "s1");
  });
});

describe("textExtractPayloadSchema（管线内部形态）", () => {
  it("校验 normalize 派生的 regions/paragraphs", () => {
    const payload = textExtractPayloadSchema.parse(
      normalizeTextExtractFromLlm([{ regionId: "s1", texts: ["Hi"] }])
    );
    assert.equal(payload.regions[0]?.paragraphs[0]?.textId, "s1-t0");
  });
});
