import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCompactNodeLabel,
  resolveBlockMetaDisplayName,
  resolveSectionShellDisplayName,
} from "./resolveBlockMetaName";

describe("resolveBlockMetaDisplayName", () => {
  it("优先 Stage C label", () => {
    assert.equal(
      resolveBlockMetaDisplayName({
        kind: "layout.grid",
        label: "商品栅格",
      }),
      "商品栅格"
    );
  });

  it("text 按 B3 role 兜底", () => {
    assert.equal(
      resolveBlockMetaDisplayName({
        kind: "content.text",
        textRole: "heading",
      }),
      "标题"
    );
  });

  it("image 按 slot role 兜底", () => {
    assert.equal(
      resolveBlockMetaDisplayName({
        kind: "content.image",
        imageSlotRole: "hero",
      }),
      "头图"
    );
  });

  it("button 兜底为按钮", () => {
    assert.equal(
      resolveBlockMetaDisplayName({ kind: "action.button" }),
      "按钮"
    );
  });
});

describe("resolveSectionShellDisplayName", () => {
  it("使用 Stage A region", () => {
    assert.equal(resolveSectionShellDisplayName("商品宫格", "s5"), "商品宫格");
  });

  it("region 空时回落 sectionId", () => {
    assert.equal(resolveSectionShellDisplayName("  ", "s3"), "s3");
  });
});

describe("normalizeCompactNodeLabel", () => {
  it("trim 并截断超长 label", () => {
    assert.equal(normalizeCompactNodeLabel("  标题  "), "标题");
    assert.equal(normalizeCompactNodeLabel("x".repeat(40))?.length, 32);
  });
});
