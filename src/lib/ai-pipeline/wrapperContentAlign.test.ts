import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasExplicitHorizontalAlign,
  mergeContentAlignPreservingExplicit,
  needsContentAlignPatch,
} from "./wrapperContentAlign";

describe("wrapperContentAlign", () => {
  it("needsContentAlignPatch：缺对象或缺轴为 true", () => {
    assert.equal(needsContentAlignPatch(undefined), true);
    assert.equal(needsContentAlignPatch({}), true);
    assert.equal(needsContentAlignPatch({ contentAlign: {} }), true);
    assert.equal(
      needsContentAlignPatch({ contentAlign: { horizontal: "left" } }),
      true
    );
  });

  it("两轴合法时 needsContentAlignPatch 为 false", () => {
    assert.equal(
      needsContentAlignPatch({
        contentAlign: { horizontal: "right", vertical: "bottom" },
      }),
      false
    );
  });

  it("mergeContentAlignPreservingExplicit 保留 LLM 已写轴", () => {
    assert.deepEqual(
      mergeContentAlignPreservingExplicit(
        { horizontal: "left", vertical: "bottom" },
        "center"
      ),
      { horizontal: "left", vertical: "bottom" }
    );
    assert.deepEqual(
      mergeContentAlignPreservingExplicit({ horizontal: "left" }, "center"),
      { horizontal: "left", vertical: "top" }
    );
    assert.deepEqual(
      mergeContentAlignPreservingExplicit(
        { horizontal: "left" },
        "center",
        { overlayImage: true }
      ),
      { horizontal: "left", vertical: "center" }
    );
  });

  it("hasExplicitHorizontalAlign", () => {
    assert.equal(hasExplicitHorizontalAlign({ contentAlign: { horizontal: "center" } }), true);
    assert.equal(hasExplicitHorizontalAlign({ contentAlign: { horizontal: "bogus" } }), false);
  });
});
