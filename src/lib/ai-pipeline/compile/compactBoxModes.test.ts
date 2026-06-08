import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCompactBoxModesToSection } from "./compactBoxModes";
import type { GroundingSection } from "../types";

const section: GroundingSection = {
  sectionId: "s1",
  name: "测试",
  order: 0,
};

describe("applyCompactBoxModesToSection 缺省 widthMode", () => {
  it("竖排正文默认 fill，按钮默认 hug", () => {
    const root = {
      kind: "layout.container" as const,
      props: { direction: "vertical" },
      children: [
        { kind: "content.text" as const, props: { textId: "s1-t0" } },
        { kind: "action.button" as const, props: { textId: "s1-t1" } },
      ],
    };
    const out = applyCompactBoxModesToSection(root, section);
    assert.equal(out?.children?.[0]?.wrapper?.widthMode, "fill");
    assert.equal(out?.children?.[1]?.wrapper?.widthMode, "hug");
  });

  it("横排 layout 下 text 默认 hug", () => {
    const root = {
      kind: "layout.container" as const,
      props: { direction: "horizontal" },
      children: [
        { kind: "content.icon" as const, props: { iconRef: "i1" } },
        { kind: "content.text" as const, props: { textId: "s1-t0" } },
      ],
    };
    const out = applyCompactBoxModesToSection(root, section);
    assert.equal(out?.children?.[0]?.wrapper?.widthMode, "hug");
    assert.equal(out?.children?.[1]?.wrapper?.widthMode, "hug");
  });

  it("Stage C 显式 fill 的全宽按钮保留 fill", () => {
    const root = {
      kind: "action.button" as const,
      props: { textId: "s1-t0" },
      wrapper: { widthMode: "fill" as const },
    };
    const out = applyCompactBoxModesToSection(root, section);
    assert.equal(out?.wrapper?.widthMode, "fill");
  });
});
