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
        borderToCss({ mode: "unified", width: "0", style: "solid", color: "#000" })
      ),
      false
    );
  });

  it("正宽描边视为可见", () => {
    assert.equal(
      borderCssHasVisibleWidth(
        borderToCss({ mode: "unified", width: "3px", style: "solid", color: "#DC2626" })
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
        padding: { mode: "unified", unified: "10px" },
        contentAlign: { horizontal: "left", vertical: "top" },
        backgroundImage: {
          src: "https://example.com/x.jpg",
          fit: "cover",
          position: "left center",
        },
      },
    });
    assert.ok(layout);
    assert.equal(layout.overlayPaddingCss, "10px");
    assert.equal(layout.outerBoxCss.padding, undefined);
    assert.equal(layout.fixedCanvasHeight, "100px");
    assert.equal(layout.overlayVerticalValign, "top");
  });

  it("图级描边仅写入 overlayBorderCss，不打在外层盒（避免定高 + 双层 border 裁切）", () => {
    const layout = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "100px",
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        contentAlign: { horizontal: "left", vertical: "top" },
        backgroundImage: {
          src: "https://example.com/x.jpg",
          fit: "cover",
          border: { mode: "unified", width: "3px", style: "solid", color: "#DC2626" },
        },
      },
    });
    assert.ok(layout);
    assert.equal(layout.overlayBorderCss.border, "3px solid #DC2626");
    assert.notEqual(layout.outerBoxCss.border, "3px solid #DC2626");
    assert.equal(layout.fixedCanvasHeight, "100px");
    assert.equal(layout.bgTableBorderCollapse, "separate");
    assert.equal(layout.bgTableHeightFromTd, true);
  });

  it("无定高或无图级描边时 table 布局默认值", () => {
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

    const fixedNoBorder = resolveWrapperBackgroundImageCanvasLayout({
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "80px",
        backgroundImage: {
          src: "https://example.com/x.jpg",
          fit: "cover",
          border: { mode: "unified", width: "0", style: "solid", color: "#000" },
        },
      },
    });
    assert.ok(fixedNoBorder);
    assert.equal(fixedNoBorder.bgTableHeightFromTd, true);
    assert.equal(fixedNoBorder.bgTableBorderCollapse, "collapse");
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
