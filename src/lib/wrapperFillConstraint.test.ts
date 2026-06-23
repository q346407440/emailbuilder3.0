import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock } from "../types/email";
import {
  getButtonBodyFillValidationReason,
  getFillOptionTitle,
  getFillValidationReason,
  getWrapperModeHint,
  isButtonBodyFillBlockedByWrapperHug,
  isChildFillBlockedByParentHug,
  normalizeBlockWrapperDimensionModes,
  normalizeButtonBodyDimensionModes,
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

  it("父级纵向 layout 且 widthMode=hug 时，阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "hug",
      heightMode: "fill",
    });
    assert.equal(isChildFillBlockedByParentHug(parent, "width"), true);
  });

  it("父级纵向 layout 且 widthMode=fill 时，不阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "fill",
      heightMode: "hug",
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

describe("normalizeBlockWrapperDimensionModes", () => {
  it("纵排 hug 宽父下子级 width fill 回落 hug", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "hug",
      heightMode: "fill",
    });
    const template = {
      blocks: {
        parent,
        child: {
          id: "child",
          type: "text" as const,
          parentId: "parent",
          children: [],
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          props: {},
          bindings: {},
        },
      },
    } as unknown as import("../types/email").EmailTemplate;
    const { wrapperStyle, changed, changes } = normalizeBlockWrapperDimensionModes(
      template,
      "child"
    );
    assert.equal(changed, true);
    assert.equal(wrapperStyle?.widthMode, "hug");
    assert.equal(changes[0]?.axis, "width");
  });

  it("横排 hug 父下子级 width fill 回落 hug", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "hug",
      heightMode: "fill",
    });
    const template = {
      blocks: {
        parent,
        child: {
          id: "child",
          type: "text" as const,
          parentId: "parent",
          children: [],
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          props: {},
          bindings: {},
        },
      },
    } as unknown as import("../types/email").EmailTemplate;
    const { wrapperStyle, changed, changes } = normalizeBlockWrapperDimensionModes(
      template,
      "child"
    );
    assert.equal(changed, true);
    assert.equal(wrapperStyle?.widthMode, "hug");
    assert.equal(changes[0]?.axis, "width");
  });
});

describe("isButtonBodyFillBlockedByWrapperHug", () => {
  function createButton(wrapperStyle: { widthMode?: string; heightMode?: string }, buttonStyle: Record<string, unknown>) {
    return {
      id: "btn",
      type: "button" as const,
      parentId: "parent",
      children: [],
      wrapperStyle,
      props: { text: "Go", link: "#", buttonStyle },
      bindings: {},
    };
  }

  it("外层 width hug 时阻止胶囊 width fill", () => {
    const block = createButton({ widthMode: "hug", heightMode: "fill" }, { widthMode: "fill", heightMode: "hug" });
    assert.equal(isButtonBodyFillBlockedByWrapperHug(block, "width"), true);
    assert.equal(isButtonBodyFillBlockedByWrapperHug(block, "height"), false);
  });

  it("外层 height hug 时阻止胶囊 height fill", () => {
    const block = createButton({ widthMode: "fill", heightMode: "hug" }, { widthMode: "hug", heightMode: "fill" });
    assert.equal(isButtonBodyFillBlockedByWrapperHug(block, "width"), false);
    assert.equal(isButtonBodyFillBlockedByWrapperHug(block, "height"), true);
  });
});

describe("normalizeButtonBodyDimensionModes", () => {
  it("外层 hug 同轴下胶囊 fill 回落 hug", () => {
    const button = {
      id: "btn",
      type: "button" as const,
      parentId: "parent",
      children: [],
      wrapperStyle: { widthMode: "hug" as const, heightMode: "hug" as const },
      props: {
        text: "Go",
        link: "#",
        buttonStyle: { widthMode: "fill", heightMode: "fill" },
      },
      bindings: {},
    };
    const template = { blocks: { btn: button } } as unknown as import("../types/email").EmailTemplate;
    const { props, changed, changes } = normalizeButtonBodyDimensionModes(template, "btn");
    assert.equal(changed, true);
    const bs = (props as { buttonStyle?: Record<string, unknown> }).buttonStyle;
    assert.equal(bs?.widthMode, "hug");
    assert.equal(bs?.heightMode, "hug");
    assert.equal(changes.length, 2);
  });
});

describe("wrapperFillConstraint 文案", () => {
  it("宽度轴禁用时返回一致文案", () => {
    assert.match(getWrapperModeHint("width", true), /循环依赖/);
    assert.equal(getFillOptionTitle("width", true), "父级宽度模式为跟随内容（hug）时不可用");
    assert.match(getFillValidationReason("width"), /width fill/);
  });

  it("高度轴禁用时返回一致文案", () => {
    assert.match(getWrapperModeHint("height", true), /循环依赖/);
    assert.equal(getFillOptionTitle("height", true), "父级高度模式为跟随内容（hug）时不可用");
    assert.match(getFillValidationReason("height"), /height fill/);
  });
});
