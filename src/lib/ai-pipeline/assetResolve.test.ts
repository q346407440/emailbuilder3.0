import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveIconCdnCandidates } from "./iconCdnResolve";

/** 与 createDefaultAssetResolver 内 icon 分支一致：不采用索引 fallback。 */
function pipelineIconCandidates(pack: string, iconQuery: string) {
  return resolveIconCdnCandidates(pack, iconQuery, 5).filter((c) => !c.usedFallback);
}

describe("createDefaultAssetResolver icon 管线候选", () => {
  it("simple-icons 臆造品牌 slug（如 clare）无可用候选", () => {
    assert.equal(pipelineIconCandidates("simple-icons", "clare").length, 0);
  });

  it("simple-icons 已知 slug 仍有候选", () => {
    const hits = pipelineIconCandidates("simple-icons", "instagram");
    assert.ok(hits.length > 0);
    assert.match(hits[0]!.src, /\/instagram\.svg$/);
  });

  it("tabler 臆造 slug 不走 fallback photo", () => {
    assert.equal(pipelineIconCandidates("tabler", "not-a-real-brand-ever").length, 0);
  });
});
