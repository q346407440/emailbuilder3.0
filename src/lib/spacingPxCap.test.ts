import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMAIL_CONTAINER_SPACING_MAX_PX,
  clampSpacingPxString,
  spacingPxExceedsMax,
} from "./spacingPxCap";

describe("spacingPxCap", () => {
  it("识别超过上限", () => {
    assert.equal(spacingPxExceedsMax("28px"), true);
    assert.equal(spacingPxExceedsMax("24px"), false);
    assert.equal(spacingPxExceedsMax("28px 24px"), true);
  });

  it("压限到 24px", () => {
    assert.equal(clampSpacingPxString("40px"), "24px");
    assert.equal(clampSpacingPxString("28px 16px"), "24px 16px");
    assert.equal(clampSpacingPxString("20px"), "20px");
  });

  it("常量与技能一致", () => {
    assert.equal(EMAIL_CONTAINER_SPACING_MAX_PX, 24);
  });
});
