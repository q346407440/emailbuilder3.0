import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock } from "../types/email";
import {
  getFillOptionTitle,
  getFillValidationReason,
  getWrapperModeHint,
  isChildFillBlockedByParentHug,
} from "./wrapperFillConstraint";

function createLayoutParent(opts: {
  direction: "horizontal" | "vertical";
  widthMode: "hug" | "fill" | "fixed";
  heightMode: "hug" | "fill" | "fixed";
}): EmailBlock {
  return {
    id: "parent",
    type: "layout",
    parentId: null,
    children: ["child"],
    wrapperStyle: {
      widthMode: opts.widthMode,
      heightMode: opts.heightMode,
    },
    props: {
      direction: opts.direction,
      gap: "0",
    },
    bindings: {},
  };
}

describe("isChildFillBlockedByParentHug · 宽度轴", () => {
  it("父级横向 layout 且 widthMode=hug 时，阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "hug",
      heightMode: "fill",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "width"), true);
  });

  it("父级纵向 layout 时，不阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "hug",
      heightMode: "fill",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "width"), false);
  });

  it("父级横向但 widthMode 非 hug 时，不阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "fill",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "width"), false);
  });
});

describe("isChildFillBlockedByParentHug · 高度轴", () => {
  it("父级纵向 layout 且 heightMode=hug 时，阻止子级 height fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "fill",
      heightMode: "hug",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "height"), true);
  });

  it("父级横向 layout 时，不阻止子级 height fill", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "hug",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "height"), false);
  });

  it("父级纵向但 heightMode 非 hug 时，不阻止子级 height fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "fill",
      heightMode: "fixed",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "height"), false);
  });

  it("父级纵向 image 且 heightMode=hug 时，阻止子级 height fill", () => {
    const parent: EmailBlock = {
      id: "img",
      type: "image",
      parentId: null,
      children: ["c"],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: { direction: "vertical" },
      bindings: {},
    };
    assert.equal(isChildFillBlockedByParentHug(parent, "height"), true);
    assert.equal(isChildFillBlockedByParentHug(parent, "width"), false);
  });

  it("父级横向 image 且 widthMode=hug 时，阻止子级 width fill", () => {
    const parent: EmailBlock = {
      id: "img",
      type: "image",
      parentId: null,
      children: ["c"],
      wrapperStyle: { widthMode: "hug", heightMode: "fill" },
      props: { direction: "horizontal" },
      bindings: {},
    };
    assert.equal(isChildFillBlockedByParentHug(parent, "width"), true);
    assert.equal(isChildFillBlockedByParentHug(parent, "height"), false);
  });

  it("父级 image 且 heightMode 非 hug 时，不阻止子级 height fill", () => {
    const parent: EmailBlock = {
      id: "img",
      type: "image",
      parentId: null,
      children: ["c"],
      wrapperStyle: { widthMode: "fill", heightMode: "fixed", height: "200px" },
      props: {},
      bindings: {},
    };
    assert.equal(isChildFillBlockedByParentHug(parent, "height"), false);
  });
});

describe("wrapperFillConstraint 文案", () => {
  it("宽度轴禁用时返回一致文案", () => {
    assert.match(getWrapperModeHint("width", true), /同轴循环依赖/);
    assert.equal(getFillOptionTitle("width", true), "父级宽度模式为跟随内容（hug）时不可用");
    assert.match(getFillValidationReason("width"), /子级不允许使用 fill/);
  });

  it("高度轴禁用时返回一致文案", () => {
    assert.match(getWrapperModeHint("height", true), /同轴循环依赖/);
    assert.equal(getFillOptionTitle("height", true), "父级高度模式为跟随内容（hug）时不可用");
    assert.match(getFillValidationReason("height"), /子级不允许使用 fill/);
  });
});
