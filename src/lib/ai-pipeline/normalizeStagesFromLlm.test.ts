import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeStyleTokensFromLlm } from "./normalizeStyleTokensFromLlm";
import { normalizeIconQueriesFromLlm } from "./normalizeIconQueriesFromLlm";
import { normalizeCompactSectionFromLlm } from "./normalizeCompactSectionFromLlm";
import { normalizeStyleTokens } from "./normalizeStyleTokens";
import { injectStyleTokensResult } from "./injectPipelineMetadata";

describe("normalizeStyleTokensFromLlm", () => {
  it("preset + hex 形态映射到 tokens", () => {
    const payload = normalizeStyleTokensFromLlm({
      colors: { primary: "#000000", secondary: "#999999", surface: "#FFFFFF" },
      spacingPreset: "standard",
      typographyPreset: "standard",
      radiusPreset: "standard",
      emailBackground: "#F3F4F6",
      contentSurface: "#FFFFFF",
    });
    assert.ok(payload);
    assert.equal(payload.tokens.spacing.section, "16px");
    assert.equal(payload.canvas.contentSurface, "#FFFFFF");
  });

  it("非法颜色返回 null", () => {
    assert.equal(normalizeStyleTokensFromLlm({ colors: { primary: "red" } }), null);
  });
});

describe("normalizeIconQueriesFromLlm", () => {
  it("过滤非法项并 normalize pack/color", () => {
    const items = normalizeIconQueriesFromLlm([
      { id: 1, regionId: "s1", pack: "social", iconQuery: "instagram", colorHex: "000000" },
      { id: "icon_x", regionId: "s1", pack: "tabler", iconQuery: "truck", colorHex: "#1A1A1A" },
      { regionId: "s1", iconQuery: "bad" },
    ]);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.pack, "simple-icons");
    assert.equal(items[0]?.colorHex, "#000000");
  });
});

describe("normalizeCompactSectionFromLlm", () => {
  it("接受 { root } 并映射 kind 别名", () => {
    const payload = normalizeCompactSectionFromLlm({
      root: {
        type: "layout",
        props: { direction: "vertical" },
        children: [{ type: "text", props: { textId: "s1-t0" } }],
      },
    });
    assert.equal(payload?.root.kind, "layout.container");
    assert.equal(payload?.root.children?.[0]?.kind, "content.text");
  });

  it("unwrap component 包裹", () => {
    const payload = normalizeCompactSectionFromLlm({
      component: { kind: "content.divider" },
    });
    assert.equal(payload?.root.kind, "content.divider");
  });

  it("保留 content.image 容器 px（由 C 决定，normalize 阶段再补缺省）", () => {
    const payload = normalizeCompactSectionFromLlm({
      root: {
        kind: "content.image",
        wrapper: {
          backgroundImageRef: "s1-img-0",
          widthMode: "fill",
          heightMode: "fixed",
          height: "280px",
        },
      },
    });
    assert.equal(payload?.root.wrapper?.backgroundImageRef, "s1-img-0");
    assert.equal(payload?.root.wrapper?.height, "280px");
  });

  it("normalize 后可走 normalizeStyleTokens", () => {
    const payload = normalizeStyleTokensFromLlm({
      colors: { primary: "#111827", secondary: "#6B7280", surface: "#FFFFFF" },
      spacingPreset: "standard",
      typographyPreset: "standard",
      radiusPreset: "standard",
      emailBackground: "#F3F4F6",
      contentSurface: "#FFFFFF",
    });
    const tokens = normalizeStyleTokens(injectStyleTokensResult(payload!));
    assert.equal(tokens.typography.body, "16px");
  });
});
