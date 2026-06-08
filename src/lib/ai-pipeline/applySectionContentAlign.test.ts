import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applySectionContentAlign, horizontalAlignFromSection, normalizeWrapperContentAlign } from "./applySectionContentAlign";
import type { CompactNode, GroundingSection } from "./types";

const sectionCenter: GroundingSection = {
  sectionId: "s1",
  name: "品牌头部",
  order: 0,
  layoutHints: { align: "center" },
};

describe("applySectionContentAlign", () => {
  it("区域 align=center 时为根节点与 text 补 contentAlign", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "horizontal", gap: "0" },
      children: [
        {
          kind: "content.text",
          props: { textId: "s1-t0" },
          wrapper: { widthMode: "hug" },
        },
      ],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.wrapper?.contentAlign?.horizontal, "center");
    assert.equal(out.children?.[0]?.wrapper?.contentAlign?.horizontal, "center");
    assert.equal(out.children?.[0]?.wrapper?.widthMode, "fill");
  });

  it("缺省 align 回落 center（对齐 emailbuilder 默认）", () => {
    assert.equal(
      horizontalAlignFromSection({ sectionId: "s2", name: "x", order: 1 }),
      "center"
    );
  });

  it("LLM 只写 horizontal 时补 vertical=top", () => {
    assert.deepEqual(normalizeWrapperContentAlign({ horizontal: "center" }), {
      horizontal: "center",
      vertical: "top",
    });
    const root: CompactNode = {
      kind: "layout.container",
      wrapper: { contentAlign: { horizontal: "center" } },
      props: { direction: "vertical" },
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.wrapper?.contentAlign?.vertical, "top");
  });

  it("父级 hug 时居中 text 不强制 fill", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "vertical" },
      children: [
        {
          kind: "layout.container",
          wrapper: { widthMode: "hug", heightMode: "hug" },
          props: { direction: "vertical" },
          children: [
            {
              kind: "content.text",
              props: { textId: "s1-t0" },
            },
          ],
        },
      ],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.wrapper?.widthMode, "fill");
    assert.equal(out.children?.[0]?.wrapper?.widthMode, "hug");
    assert.equal(out.children?.[0]?.children?.[0]?.wrapper?.widthMode, "hug");
  });

  it("align=center 时 button 不强制 fill", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "vertical" },
      children: [
        {
          kind: "action.button",
          props: { textId: "s1-t0" },
          wrapper: { widthMode: "hug" },
        },
      ],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.children?.[0]?.wrapper?.widthMode, "hug");
  });

  it("右列 layout 下 text 继承 right，不被区段 center 覆盖", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "horizontal", gap: "16px" },
      children: [
        {
          kind: "content.text",
          props: { textId: "s1-t0" },
        },
        {
          kind: "layout.container",
          props: { direction: "vertical", gap: "2px" },
          wrapper: { contentAlign: { horizontal: "right" } },
          children: [
            {
              kind: "content.text",
              props: { textId: "s1-t1" },
            },
          ],
        },
      ],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.children?.[0]?.wrapper?.contentAlign?.horizontal, "center");
    assert.equal(out.children?.[1]?.wrapper?.contentAlign?.horizontal, "right");
    assert.equal(out.children?.[1]?.children?.[0]?.wrapper?.contentAlign?.horizontal, "right");
  });

  it("叠放 content.image 仅写 horizontal 时 vertical 缺省为 center", () => {
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
          props: { direction: "vertical", gap: "8px" },
          children: [
            { kind: "content.icon", props: { iconRef: "icon_x" } },
            { kind: "content.text", props: { textId: "s5-t0" } },
          ],
        },
      ],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    const img = out.children?.[0];
    assert.equal(img?.wrapper?.contentAlign?.horizontal, "center");
    assert.equal(img?.wrapper?.contentAlign?.vertical, "center");
  });

  it("叠放 content.image 显式 vertical:top 时保留", () => {
    const root: CompactNode = {
      kind: "content.image",
      wrapper: {
        backgroundImageRef: "s1-img-0",
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      children: [{ kind: "content.text", props: { textId: "s1-t0" } }],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.wrapper?.contentAlign?.horizontal, "left");
    assert.equal(out.wrapper?.contentAlign?.vertical, "top");
  });

  it("无 children 的 content.image 仍 vertical=top", () => {
    const root: CompactNode = {
      kind: "content.image",
      wrapper: { backgroundImageRef: "s3-img-0", contentAlign: { horizontal: "center" } },
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.wrapper?.contentAlign?.vertical, "top");
  });

  it("icon 行补 hug + center", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "horizontal", gap: "12px" },
      children: [
        { kind: "content.icon", props: { iconRef: "icon_a" } },
        { kind: "content.icon", props: { iconRef: "icon_b" } },
      ],
    };
    const out = applySectionContentAlign(root, sectionCenter);
    assert.equal(out.wrapper?.contentAlign?.horizontal, "center");
    assert.equal(out.wrapper?.widthMode, "hug");
  });
});
