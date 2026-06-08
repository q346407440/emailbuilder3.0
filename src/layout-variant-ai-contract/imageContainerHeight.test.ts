import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeImageContainerHeightPx } from "./imageContainerHeight";

describe("normalizeImageContainerHeightPx", () => {
  it("接受 280px 字符串", () => {
    assert.equal(normalizeImageContainerHeightPx("280px"), "280px");
  });

  it("接受纯数字并补 px", () => {
    assert.equal(normalizeImageContainerHeightPx(280), "280px");
  });

  it("clamp 超上限", () => {
    assert.equal(normalizeImageContainerHeightPx("900px"), "480px");
  });

  it("非法返回 undefined", () => {
    assert.equal(normalizeImageContainerHeightPx("tall"), undefined);
  });
});
