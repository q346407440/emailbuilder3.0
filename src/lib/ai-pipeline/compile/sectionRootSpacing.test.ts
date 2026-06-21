import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveSectionRootPadding,
  resolveUniformSectionSpacing,
} from "./sectionRootSpacing";
import type { GroundingSection } from "../types";

const baseSection: GroundingSection = {
  sectionId: "s2",
  name: "正文",
  order: 1,
};

const spacing = { section: "16px", pageInline: "20px" };

describe("resolveUniformSectionSpacing", () => {
  it("从 B1 派生全区统一竖直/水平节奏", () => {
    assert.deepEqual(resolveUniformSectionSpacing(spacing), {
      vertical: "16px",
      horizontal: "20px",
    });
  });
});

describe("resolveSectionRootPadding", () => {
  it("非首区 top/bottom 一致，左右一致", () => {
    const pad = resolveSectionRootPadding({
      section: baseSection,
      orderIndex: 1,
      spacing,
    });
    assert.deepEqual(pad, {
      top: "16px",
      right: "20px",
      bottom: "16px",
      left: "20px",
    });
  });

  it("首区仅 top=0，其余边与全区一致", () => {
    const pad = resolveSectionRootPadding({
      section: { ...baseSection, sectionId: "s1", order: 0 },
      orderIndex: 0,
      spacing,
    });
    assert.equal(pad.top, "0");
    assert.equal(pad.bottom, "16px");
    assert.equal(pad.left, "20px");
    assert.equal(pad.right, "20px");
  });

  it("忽略 gapAbove/gapBelow，保持全区统一", () => {
    const pad = resolveSectionRootPadding({
      section: {
        ...baseSection,
        layoutHints: { gapAbove: "24px", gapBelow: "12px" },
      },
      orderIndex: 1,
      spacing,
    });
    assert.equal(pad.top, "16px");
    assert.equal(pad.bottom, "16px");
  });

  it("fullWidth 仅左右为 0，竖直仍与全区一致", () => {
    const pad = resolveSectionRootPadding({
      section: {
        ...baseSection,
        layoutHints: { fullWidth: true, gapBelow: "24px" },
      },
      orderIndex: 0,
      spacing,
    });
    assert.equal(pad.left, "0");
    assert.equal(pad.right, "0");
    assert.equal(pad.top, "0");
    assert.equal(pad.bottom, "16px");
  });

  it("多区非 fullWidth 时水平 padding 完全相同", () => {
    const pads = [0, 1, 2].map((orderIndex) =>
      resolveSectionRootPadding({
        section: { ...baseSection, sectionId: `s${orderIndex + 1}`, order: orderIndex },
        orderIndex,
        spacing,
      })
    );
    for (const pad of pads) {
      assert.equal(pad.left, "20px");
      assert.equal(pad.right, "20px");
      assert.equal(pad.bottom, "16px");
    }
    assert.equal(pads[0]!.top, "0");
    assert.equal(pads[1]!.top, "16px");
    assert.equal(pads[2]!.top, "16px");
  });
});
