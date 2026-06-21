import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { borderCssHasVisibleWidth, borderToCss } from "./wrapperStyleToCss";
import {
  overlayCellAlignForWrapperBackground,
  resolveWrapperBackgroundImageCanvasLayout,
} from "./wrapperBackgroundImageCanvasLayout";

describe("borderCssHasVisibleWidth", () => {
  it("0 宽描边视为不可见", () => {
    assert.equal(
      borderCssHasVisibleWidth(
        borderToCss({ style: "solid", color: "#000", top: "0", right: "0", bottom: "0", left: "0" })
      ),
      false
    );
  });

  it("正宽描边视为可见", () => {
    assert.equal(
      borderCssHasVisibleWidth(
        borderToCss({ style: "solid", color: "#DC2626", top: "3px", right: "3px", bottom: "3px", left: "3px" })
      ),
      true
    );
  });
});

describe("resolveWrapperBackgroundImageCanvasLayout", () => {
  it("padding 仅进入 overlayPaddingCss，外层 omitPadding", () => {
    const layout = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "100px",
        padding: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
        contentAlign: { horizontal: "left", vertical: "top" },
        backgroundImage: {
          src: "https://example.com/x.jpg",
          fit: "cover",
          position: "left center",
        },
      },
    });
    assert.ok(layout);
    assert.equal(layout.overlayPaddingCss, "10px 10px 10px 10px");
    assert.equal(layout.outerBoxCss.padding, undefined);
    assert.equal(layout.fixedCanvasHeight, "100px");
    assert.equal(layout.overlayVerticalValign, "top");
  });

  it("外壳圆角继承到底图 td overlayRadiusCss", () => {
    const layout = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "100px",
        borderRadius: { topLeft: "12px", topRight: "12px", bottomRight: "12px", bottomLeft: "12px" },
        contentAlign: { horizontal: "left", vertical: "top" },
        backgroundImage: {
          src: "https://example.com/x.jpg",
          fit: "cover",
        },
      },
    });
    assert.ok(layout);
    assert.equal(layout.overlayRadiusCss.borderRadius, "12px");
    assert.equal(layout.overlayBorderCss.border, undefined);
    assert.notEqual(layout.outerBoxCss.borderRadius, undefined);
    assert.equal(layout.fixedCanvasHeight, "100px");
    assert.equal(layout.bgTableBorderCollapse, "collapse");
    assert.equal(layout.bgTableHeightFromTd, true);
  });

  it("无定高时 table 布局默认值", () => {
    const hug = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        backgroundImage: { src: "https://example.com/x.jpg", fit: "cover" },
      },
    });
    assert.ok(hug);
    assert.equal(hug.bgTableHeightFromTd, false);
    assert.equal(hug.bgTableBorderCollapse, "collapse");

    const fixed = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "80px",
        backgroundImage: {
          src: "https://example.com/x.jpg",
          fit: "cover",
        },
      },
    });
    assert.ok(fixed);
    assert.equal(fixed.bgTableHeightFromTd, true);
    assert.equal(fixed.bgTableBorderCollapse, "collapse");
  });

  it("无 alt 时使用渲染默认替代文本", () => {
    const layout = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        backgroundImage: { src: "https://example.com/x.jpg", fit: "cover" },
      },
    });
    assert.ok(layout);
    assert.equal(layout.altText, "此处是图片");
  });

  it("无有效 src 时返回 null", () => {
    assert.equal(
      resolveWrapperBackgroundImageCanvasLayout({
        wrapperStyle: { backgroundImage: { src: "  " } },
      }),
      null
    );
  });

  it("heightMode=fill 时启用 fillStretchHeight", () => {
    const layout = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fill",
        backgroundImage: { src: "https://example.com/x.jpg", fit: "cover" },
      },
    });
    assert.ok(layout);
    assert.equal(layout.fillStretchHeight, true);
    assert.equal(layout.fixedCanvasHeight, undefined);
    assert.equal(layout.outerBoxCss.height, "100%");
  });
});

describe("overlayCellAlignForWrapperBackground", () => {
  it("grid/纵排：vertical top → valign top", () => {
    assert.deepEqual(
      overlayCellAlignForWrapperBackground(undefined, { horizontal: "left", vertical: "top" }),
      { align: "left", valign: "top" }
    );
  });

  it("横排 layout：horizontal 映射到 align", () => {
    assert.deepEqual(
      overlayCellAlignForWrapperBackground("horizontal", { horizontal: "right", vertical: "top" }),
      { align: "right", valign: "top" }
    );
  });
});
