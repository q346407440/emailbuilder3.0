import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveImageContainerPreset } from "./imageContainerPresets";

describe("resolveImageContainerPreset", () => {
  it("hero standard → 280px 高", () => {
    const p = resolveImageContainerPreset({ role: "hero", layoutTier: "standard" });
    assert.equal(p.heightMode, "fixed");
    assert.equal(p.height, "280px");
    assert.equal(p.widthMode, "fill");
    assert.equal(p.backgroundImageFit, "cover");
  });

  it("logo → fixed 160×40 contain", () => {
    const p = resolveImageContainerPreset({ role: "logo" });
    assert.equal(p.width, "160px");
    assert.equal(p.height, "40px");
    assert.equal(p.backgroundImageFit, "contain");
  });

  it("card + 定高 grid → cellHeight 优先于 cardImageTier", () => {
    const p = resolveImageContainerPreset({
      role: "card",
      gridCtx: { cellHeightMode: "fixed", cellHeight: "140px" },
      cardImageTier: "compact",
    });
    assert.equal(p.heightMode, "fixed");
    assert.equal(p.height, "140px");
  });

  it("card + content-max grid + cardImageTier tall → 160px", () => {
    const p = resolveImageContainerPreset({
      role: "card",
      gridCtx: { cellHeightMode: "content-max" },
      cardImageTier: "tall",
    });
    assert.equal(p.heightMode, "fixed");
    assert.equal(p.height, "160px");
  });

  it("Stage A containerHeight 优先于档位表", () => {
    const p = resolveImageContainerPreset({
      role: "card",
      containerHeight: "280px",
      cardImageTier: "compact",
    });
    assert.equal(p.height, "280px");
  });

  it("card + content-max grid 无 tier → standard 120px", () => {
    const p = resolveImageContainerPreset({
      role: "card",
      gridCtx: { cellHeightMode: "content-max" },
    });
    assert.equal(p.heightMode, "fixed");
    assert.equal(p.height, "120px");
  });
});
