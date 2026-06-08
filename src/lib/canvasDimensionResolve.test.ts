import assert from "node:assert/strict";
import test from "node:test";
import {
  isStrictFixedAxis,
  normalizeWrapperDimensionMode,
  parseCssPx,
  resolveComponentBodyWidthCss,
  resolveEffectiveLayoutWidth,
  resolveEmailRootShellCss,
  isPreviewViewportNarrowerThanRoot,
  resolvePreviewViewportClipCss,
  resolveWrapperHeightCss,
  resolveWrapperWidthCss,
} from "./canvasDimensionResolve";

test("normalizeWrapperDimensionMode 非法值回退", () => {
  assert.equal(normalizeWrapperDimensionMode("hug"), "hug");
  assert.equal(normalizeWrapperDimensionMode(undefined, "fill"), "fill");
  assert.equal(normalizeWrapperDimensionMode("bad", "hug"), "hug");
});

test("isStrictFixedAxis 仅 fixed 为 true", () => {
  assert.equal(isStrictFixedAxis("fixed"), true);
  assert.equal(isStrictFixedAxis("hug"), false);
  assert.equal(isStrictFixedAxis("fill"), false);
});

test("parseCssPx", () => {
  assert.equal(parseCssPx("600px"), 600);
  assert.equal(parseCssPx(" 375px "), 375);
  assert.equal(parseCssPx("bad"), undefined);
});

test("resolveEffectiveLayoutWidth = min(版心, 视窗)", () => {
  assert.equal(
    resolveEffectiveLayoutWidth({ rootConfiguredWidthPx: 600, previewViewportPx: 600 }),
    600
  );
  assert.equal(
    resolveEffectiveLayoutWidth({ rootConfiguredWidthPx: 600, previewViewportPx: 375 }),
    375
  );
  assert.equal(
    resolveEffectiveLayoutWidth({ rootConfiguredWidthPx: 600, previewViewportPx: 800 }),
    600
  );
});

test("resolveWrapperWidthCss：fixed 无 maxWidth", () => {
  assert.deepEqual(
    resolveWrapperWidthCss({ mode: "fixed", fixedWidth: "320px" }),
    { width: "320px" }
  );
  assert.deepEqual(resolveWrapperWidthCss({ mode: "fill" }), { width: "100%" });
  assert.deepEqual(resolveWrapperWidthCss({ mode: "hug" }), {
    width: "auto",
    maxWidth: "100%",
  });
});

test("resolveWrapperHeightCss：fixed 无 maxHeight", () => {
  assert.deepEqual(
    resolveWrapperHeightCss({ mode: "fixed", fixedHeight: "200px" }),
    { height: "200px" }
  );
  assert.deepEqual(resolveWrapperHeightCss({ mode: "fill" }), { height: "100%" });
  assert.deepEqual(resolveWrapperHeightCss({ mode: "hug" }), {});
});

test("resolveComponentBodyWidthCss：fixed 内核宽强制", () => {
  assert.deepEqual(
    resolveComponentBodyWidthCss({
      mode: "fixed",
      fixedWidth: "120px",
      defaultMode: "hug",
    }),
    { display: "block", width: "120px" }
  );
  assert.deepEqual(
    resolveComponentBodyWidthCss({ mode: "hug", defaultMode: "hug" }),
    { display: "inline-block", maxWidth: "100%" }
  );
});

test("resolveEmailRootShellCss 保持配置宽 + overflow hidden", () => {
  assert.deepEqual(resolveEmailRootShellCss({ configuredWidth: "600px" }), {
    width: "600px",
    overflow: "hidden",
    boxSizing: "border-box",
  });
});

test("resolvePreviewViewportClipCss", () => {
  assert.deepEqual(resolvePreviewViewportClipCss(375), {
    width: 375,
    maxWidth: "100%",
    margin: "0 auto",
    overflow: "hidden",
  });
});

test("isPreviewViewportNarrowerThanRoot", () => {
  assert.equal(isPreviewViewportNarrowerThanRoot(375, 600), true);
  assert.equal(isPreviewViewportNarrowerThanRoot(600, 600), false);
  assert.equal(isPreviewViewportNarrowerThanRoot(800, 600), false);
});
