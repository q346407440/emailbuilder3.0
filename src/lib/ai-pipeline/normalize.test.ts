import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCompactSectionTree } from "./normalize";
import type { CompactNode, GroundingSection } from "./types";

const section: GroundingSection = {
  sectionId: "s3",
  name: "商品栅格",
  order: 3,
  hasImage: true,
  imageQuery: "yoga",
  layoutHints: { cardImageTier: "standard" },
  imageSlots: [{ slotId: "s3-img-0", imageQuery: "yoga", role: "card" }],
};

describe("normalizeCompactSectionTree", () => {
  it("grid 定高单元格内 content.image fill 归一化为 fixed + cellHeight", () => {
    const root: CompactNode = {
      kind: "layout.grid",
      props: { columns: 2, cellHeightMode: "fixed", cellHeight: "120px" },
      children: [
        {
          kind: "content.image",
          wrapper: { backgroundImageRef: "s3-image", heightMode: "fill" },
        },
      ],
    };
    const out = normalizeCompactSectionTree(root, section);
    assert.ok(out?.children?.[0]);
    assert.equal(out.children[0].wrapper?.heightMode, "fixed");
    assert.equal(out.children[0].wrapper?.height, "120px");
  });

  it("grid 内 layout 包裹的 card 图在 content-max 下按 cardImageTier 定高", () => {
    const root: CompactNode = {
      kind: "layout.grid",
      props: { columns: 1, cellHeight: "80px" },
      children: [
        {
          kind: "layout.container",
          children: [
            {
              kind: "content.image",
              wrapper: { backgroundImageRef: "s3-img-0", heightMode: "fill" },
            },
          ],
        },
      ],
    };
    const out = normalizeCompactSectionTree(root, section);
    const image = out?.children?.[0]?.children?.[0];
    assert.equal(out?.props?.cellHeightMode, "content-max");
    assert.equal(out?.props?.cellHeight, undefined);
    assert.equal(image?.wrapper?.heightMode, "fixed");
    assert.equal(image?.wrapper?.height, "120px");
  });

  it("父级 hug layout 下子级 width fill 回落 hug", () => {
    const root: CompactNode = {
      kind: "layout.container",
      wrapper: { widthMode: "fill", heightMode: "hug" },
      props: { direction: "vertical" },
      children: [
        {
          kind: "layout.container",
          wrapper: { widthMode: "hug", heightMode: "hug" },
          props: { direction: "vertical" },
          children: [
            {
              kind: "content.text",
              wrapper: { widthMode: "fill", heightMode: "hug" },
              props: { textId: "s1-t0" },
            },
          ],
        },
      ],
    };
    const out = normalizeCompactSectionTree(root, {
      sectionId: "s1",
      name: "logo",
      order: 0,
    });
    assert.equal(out?.children?.[0]?.children?.[0]?.wrapper?.widthMode, "hug");
  });
});
