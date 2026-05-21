import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalImageObjectPositionCss, imageObjectPositionCssForFit } from "./imageObjectPosition";

describe("imageObjectPosition", () => {
  it("归一化常见画面位置别名", () => {
    assert.equal(canonicalImageObjectPositionCss("left"), "left center");
    assert.equal(canonicalImageObjectPositionCss("top right"), "right top");
    assert.equal(canonicalImageObjectPositionCss("40% 30%"), "40% 30%");
  });

  it("cover 裁切时应用画面位置", () => {
    assert.equal(imageObjectPositionCssForFit("left", "cover"), "left center");
    assert.equal(imageObjectPositionCssForFit("40% 30%", "cover"), "40% 30%");
  });

  it("contain 完整显示时画面位置固定为居中，避免移动小图标", () => {
    assert.equal(imageObjectPositionCssForFit("left", "contain"), "center");
    assert.equal(imageObjectPositionCssForFit("right bottom", "contain"), "center");
  });
});
