import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { injectGroundingResult } from "../injectPipelineMetadata";
import { normalizeGroundingFromLlm } from "../normalizeGroundingFromLlm";
import type { AssetResolver, AssetResolveInput, AssetResolveResult } from "../ports/AssetResolver";
import { runStageB4 } from "./stageB4";

const stubResolver: AssetResolver = {
  async resolve(input: AssetResolveInput): Promise<AssetResolveResult> {
    if (input.kind !== "pexels-photo") return { ok: false, reason: "ICON_NOT_FOUND" };
    return {
      ok: true,
      url: `https://images.pexels.com/photos/99999/pexels-photo-99999.jpeg?q=${encodeURIComponent(input.query)}`,
      alt: input.query,
    };
  },
};

describe("runStageB4", () => {
  it("将 resolveImagesFromGrounding 的 images 表透传给管线（非 undefined）", async () => {
    const grounding = injectGroundingResult(
      normalizeGroundingFromLlm([
        {
          id: "s1",
          region: "商品",
          hasImage: true,
          imageSlots: [{ imageQuery: "yoga model", role: "card" }],
        },
      ])!
    );

    const result = await runStageB4(grounding, stubResolver);

    assert.equal(result.resolved.length, 1);
    assert.ok(result.images, "images  manifest 不得为 undefined");
    assert.equal(result.images["s1-img-0"]?.url, result.resolved[0]?.url);
    assert.match(result.images["s1-img-0"]?.url ?? "", /99999/);
  });
});
