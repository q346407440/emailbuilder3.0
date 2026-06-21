import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ctaBorderRadius,
  isColoredWrapperBackground,
  resolveImageBorderRadiusFromB1,
  stripCompactBorderRadiusTree,
  zeroBorderRadius,
} from "./blockRadiusLowering";
import type { CompactNode, GroundingSection } from "../types";

describe("resolveImageBorderRadiusFromB1", () => {
  const panel = "12px";

  it("card 图使用 panel 圆角", () => {
    const r = resolveImageBorderRadiusFromB1(panel, { role: "card" });
    assert.equal(r.topLeft, "12px");
  });

  it("全宽 hero 为直角", () => {
    const section: GroundingSection = {
      sectionId: "s1",
      name: "头图",
      order: 0,
      layoutHints: { fullWidth: true },
      hasOverlay: true,
    };
    const r = resolveImageBorderRadiusFromB1(panel, { role: "hero", section });
    assert.equal(r.topLeft, "0");
  });

  it("logo 为直角", () => {
    const r = resolveImageBorderRadiusFromB1(panel, { role: "logo" });
    assert.equal(r.topLeft, "0");
  });

  it("panel=0 时一律直角", () => {
    const r = resolveImageBorderRadiusFromB1("0", { role: "card" });
    assert.equal(r.topLeft, "0");
  });
});

describe("isColoredWrapperBackground", () => {
  it("识别有色背景", () => {
    assert.equal(isColoredWrapperBackground("#FFF0F3", "#FFFFFF", "#FFFFFF"), true);
    assert.equal(isColoredWrapperBackground("#FFFFFF", "#FFFFFF", "#FFFFFF"), false);
    assert.equal(isColoredWrapperBackground("rgba(0,0,0,0)", "#FFFFFF", "#FFFFFF"), false);
  });
});

describe("stripCompactBorderRadiusTree", () => {
  it("递归剥离 compact borderRadius", () => {
    const root: CompactNode = {
      kind: "layout.container",
      wrapper: { borderRadius: { topLeft: "8px", topRight: "8px", bottomRight: "8px", bottomLeft: "8px" }, widthMode: "fill" },
      children: [
        {
          kind: "content.text",
          wrapper: { borderRadius: { topLeft: "4px", topRight: "4px", bottomRight: "4px", bottomLeft: "4px" } },
        },
      ],
    };
    const out = stripCompactBorderRadiusTree(root);
    assert.equal(out.wrapper?.borderRadius, undefined);
    assert.equal(out.children?.[0]?.wrapper?.borderRadius, undefined);
  });
});

describe("ctaBorderRadius", () => {
  it("返回 B1 cta 档位", () => {
    assert.deepEqual(ctaBorderRadius("8px"), {
      topLeft: "8px",
      topRight: "8px",
      bottomRight: "8px",
      bottomLeft: "8px",
    });
    assert.deepEqual(zeroBorderRadius(), {
      topLeft: "0",
      topRight: "0",
      bottomRight: "0",
      bottomLeft: "0",
    });
  });
});
