import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyImageWrapperDefaults } from "./imageWrapperDefaults";
import { imageSearchTargetWidth, imageSlotId, inferSearchOrientation } from "./groundingImage";

describe("groundingImage", () => {
  it("imageSlotId 按分区与序号生成", () => {
    assert.equal(imageSlotId("s3"), "s3-img-0");
    assert.equal(imageSlotId("s3", 2), "s3-img-2");
  });

  it("inferSearchOrientation 由宽高推断", () => {
    assert.equal(inferSearchOrientation(600, 400), "landscape");
    assert.equal(inferSearchOrientation(300, 400), "portrait");
    assert.equal(inferSearchOrientation(200, 200), "square");
  });

  it("imageSearchTargetWidth 优先 A 估宽", () => {
    assert.equal(imageSearchTargetWidth(80), 80);
    assert.equal(imageSearchTargetWidth(undefined), 600);
  });
});

describe("applyImageWrapperDefaults", () => {
  it("缺省 fill + fixed 280px", () => {
    const w = applyImageWrapperDefaults({ backgroundImageRef: "s1-image" });
    assert.equal(w.widthMode, "fill");
    assert.equal(w.heightMode, "fixed");
    assert.equal(w.height, "280px");
  });

  it("clamp 过高高度", () => {
    const w = applyImageWrapperDefaults({ height: "900px", heightMode: "fixed" });
    assert.equal(w.height, "480px");
  });

  it("保留 C 已写合法尺寸", () => {
    const w = applyImageWrapperDefaults({
      widthMode: "fixed",
      heightMode: "fixed",
      width: "160px",
      height: "40px",
    });
    assert.equal(w.width, "160px");
    assert.equal(w.height, "40px");
  });

  it("定高 grid 内 fill 转为 fixed + cellHeight", () => {
    const w = applyImageWrapperDefaults(
      { backgroundImageRef: "s3-image", heightMode: "fill" },
      { cellHeightMode: "fixed", cellHeight: "120px" }
    );
    assert.equal(w.heightMode, "fixed");
    assert.equal(w.height, "120px");
  });

  it("content-max grid 不强制改写 fill", () => {
    const w = applyImageWrapperDefaults(
      { backgroundImageRef: "s3-image", heightMode: "fill" },
      { cellHeightMode: "content-max", cellHeight: "120px" }
    );
    assert.equal(w.heightMode, "fill");
  });
});
