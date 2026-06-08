import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileCompactSectionRoot } from "./compileCompactSection";
import { sanitizeCompactIrTree } from "./sanitizeCompactIr";
import type { CompactNode, GroundingSection } from "../types";

const sectionCenter: GroundingSection = {
  sectionId: "s1",
  name: "Logo",
  order: 0,
  layoutHints: { align: "center" },
};

describe("compileCompactSectionRoot", () => {
  it("剥离 crossAlign 等禁止 wrapper 键", () => {
    const root: CompactNode = {
      kind: "layout.container",
      wrapper: { crossAlign: "center", widthMode: "fill" },
      props: { direction: "vertical" },
    };
    const out = sanitizeCompactIrTree(root);
    assert.equal((out.wrapper as Record<string, unknown>).crossAlign, undefined);
  });

  it("hug 父下 text fill 编译为 hug", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "vertical" },
      children: [
        {
          kind: "layout.container",
          wrapper: { widthMode: "hug", heightMode: "hug" },
          children: [
            {
              kind: "content.text",
              props: { textId: "s1-t0" },
              wrapper: { widthMode: "fill" },
            },
          ],
        },
      ],
    };
    const out = compileCompactSectionRoot(root, sectionCenter);
    assert.equal(out?.children?.[0]?.children?.[0]?.wrapper?.widthMode, "hug");
    assert.equal(out?.children?.[0]?.children?.[0]?.wrapper?.contentAlign?.vertical, "top");
  });

  it("image 按 role=hero 写容器高", () => {
    const section: GroundingSection = {
      sectionId: "s2",
      name: "Banner",
      order: 1,
      hasImage: true,
      hasOverlay: true,
      imageSlots: [
        {
          slotId: "s2-img-0",
          imageQuery: "banner",
          role: "hero",
          layoutTier: "compact",
        },
      ],
    };
    const root: CompactNode = {
      kind: "content.image",
      wrapper: { backgroundImageRef: "s2-img-0", height: "999px", widthMode: "fixed" },
    };
    const out = compileCompactSectionRoot(root, section);
    assert.equal(out?.wrapper?.heightMode, "fixed");
    assert.equal(out?.wrapper?.height, "200px");
    assert.equal(out?.wrapper?.widthMode, "fill");
  });

  it("剥离区域根 layout.container 的 padding（区段留白由 E 区段壳写入）", () => {
    const root: CompactNode = {
      kind: "layout.container",
      wrapper: { padding: { mode: "unified", unified: "20px" }, widthMode: "fill" },
      props: { direction: "vertical" },
    };
    const out = compileCompactSectionRoot(root, sectionCenter);
    assert.equal(out?.wrapper?.padding, undefined);
  });

  it("hasOverlay 的 content.image 保留 overlay 内边距 padding", () => {
    const section: GroundingSection = {
      sectionId: "s1",
      name: "Hero",
      order: 0,
      hasOverlay: true,
      hasImage: true,
    };
    const root: CompactNode = {
      kind: "content.image",
      wrapper: {
        backgroundImageRef: "s1-img-0",
        padding: { mode: "unified", unified: "32px" },
      },
    };
    const out = compileCompactSectionRoot(root, section);
    assert.equal(out?.wrapper?.padding?.unified ?? out?.wrapper?.padding?.value, "32px");
  });

  it("编译后叠放配图 vertical 为 center", () => {
    const root: CompactNode = {
      kind: "layout.grid",
      props: { columns: 4, gap: "0" },
      children: [
        {
          kind: "content.image",
          wrapper: {
            backgroundImageRef: "s5-img-0",
            contentAlign: { horizontal: "center" },
          },
          props: { direction: "vertical" },
          children: [
            { kind: "content.icon", props: { iconRef: "icon_x" } },
            { kind: "content.text", props: { textId: "s5-t0" } },
          ],
        },
      ],
    };
    const out = compileCompactSectionRoot(root, sectionCenter);
    assert.equal(out?.children?.[0]?.wrapper?.contentAlign?.vertical, "center");
  });

  it("编译后右列 text 仍为 right", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "horizontal", gap: "16px" },
      children: [
        { kind: "content.text", props: { textId: "s1-t0" } },
        {
          kind: "layout.container",
          props: { direction: "vertical" },
          wrapper: { contentAlign: { horizontal: "right" } },
          children: [{ kind: "content.text", props: { textId: "s1-t1" } }],
        },
      ],
    };
    const out = compileCompactSectionRoot(root, sectionCenter);
    assert.equal(out?.children?.[1]?.children?.[0]?.wrapper?.contentAlign?.horizontal, "right");
  });

  it("LLM 已写完整 contentAlign 时 D 层不覆盖水平轴", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "vertical" },
      wrapper: { contentAlign: { horizontal: "left", vertical: "top" } },
      children: [
        {
          kind: "content.text",
          props: { textId: "s1-t0" },
          wrapper: { contentAlign: { horizontal: "left", vertical: "bottom" } },
        },
      ],
    };
    const sectionLeft: GroundingSection = {
      sectionId: "s1",
      name: "左对齐区",
      order: 0,
      layoutHints: { align: "center" },
    };
    const out = compileCompactSectionRoot(root, sectionLeft);
    assert.equal(out?.wrapper?.contentAlign?.horizontal, "left");
    assert.equal(out?.wrapper?.contentAlign?.vertical, "top");
    assert.equal(out?.children?.[0]?.wrapper?.contentAlign?.horizontal, "left");
    assert.equal(out?.children?.[0]?.wrapper?.contentAlign?.vertical, "bottom");
  });

  it("剥离 compact 树中的 borderRadius", () => {
    const root: CompactNode = {
      kind: "layout.container",
      wrapper: { borderRadius: { mode: "unified", radius: "12px" }, widthMode: "fill" },
    };
    const out = compileCompactSectionRoot(root, sectionCenter);
    assert.equal(out?.wrapper?.borderRadius, undefined);
  });
});
