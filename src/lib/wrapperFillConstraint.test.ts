import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailTemplate } from "../types/email";
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
  id?: string;
  direction: "horizontal" | "vertical";
  widthMode: "hug" | "fill" | "fixed";
  heightMode: "hug" | "fill" | "fixed";
  children?: string[];
}): EmailBlock {
  const id = opts.id ?? "parent";
  return {
    id,
    type: "layout",
    parentId: null,
    children: opts.children ?? ["child"],
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

function templateWithChildren(
  parent: EmailBlock,
  children: Record<string, EmailBlock>
): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    emailId: "t",
    templateId: "t",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: parent.id,
    blocks: {
      [parent.id]: parent,
      ...children,
    },
  };
}

describe("isChildFillBlockedByParentHug · 宽度轴", () => {
  it("父级 hug 宽且仅一子、无兄弟锚点 → 阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "hug",
      heightMode: "fill",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "text",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {},
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "child", "width"), true);
  });

  it("父级纵向 layout 且 widthMode=hug 时，阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "hug",
      heightMode: "fill",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "text",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {},
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "child", "width"), true);
  });

  it("父级 hug 宽但有兄弟宽度锚点 → 不阻止 fill 子级", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "hug",
      heightMode: "fill",
      children: ["anchor", "fillChild"],
    });
    const template = templateWithChildren(parent, {
      anchor: {
        id: "anchor",
        type: "text",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "hug", heightMode: "hug" },
        props: {},
        bindings: {},
      },
      fillChild: {
        id: "fillChild",
        type: "layout",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gap: "0" },
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "fillChild", "width"), false);
  });

  it("父级 widthMode 非 hug 时，不阻止子级 width fill", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "fill",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "text",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {},
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "child", "width"), false);
  });
});

describe("isChildFillBlockedByParentHug · 高度轴", () => {
  it("父级 hug 高且仅一子 → 阻止子级 height fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "fill",
      heightMode: "hug",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "layout",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "fill" },
        props: { direction: "vertical", gap: "0" },
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "child", "height"), true);
  });

  it("横排 hug 高、仅一子 image fill 高 → 阻止", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "hug",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "image",
        parentId: "parent",
        children: [],
        wrapperStyle: {
          widthMode: "fixed",
          width: "130px",
          heightMode: "fill",
          height: "130px",
        },
        props: {},
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "child", "height"), true);
  });

  it("横排 hug 高、左图 fill 高 + 右栏有文本锚点 → 允许左图 fill 高", () => {
    const parent = createLayoutParent({
      id: "row",
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "hug",
      children: ["imageLeft", "stackRight"],
    });
    const template = templateWithChildren(parent, {
      imageLeft: {
        id: "imageLeft",
        type: "image",
        parentId: "row",
        children: [],
        wrapperStyle: {
          widthMode: "fixed",
          width: "130px",
          heightMode: "fill",
        },
        props: {},
        bindings: {},
      },
      stackRight: {
        id: "stackRight",
        type: "layout",
        parentId: "row",
        children: ["txt"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gap: "0" },
        bindings: {},
      },
      txt: {
        id: "txt",
        type: "text",
        parentId: "stackRight",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { text: "quote" },
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "imageLeft", "height"), false);
  });

  it("父级 heightMode 非 hug 时，不阻止子级 height fill", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "fill",
      heightMode: "fixed",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "layout",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "fill" },
        props: { direction: "vertical", gap: "0" },
        bindings: {},
      },
    });
    assert.equal(isChildFillBlockedByParentHug(template, "child", "height"), false);
  });
});

describe("normalizeBlockWrapperDimensionModes", () => {
  it("纵排 hug 宽父下子级 width fill 回落 hug", () => {
    const parent = createLayoutParent({
      direction: "vertical",
      widthMode: "hug",
      heightMode: "fill",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "text",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {},
        bindings: {},
      },
    });
    const { wrapperStyle, changed, changes } = normalizeBlockWrapperDimensionModes(
      template,
      "child"
    );
    assert.equal(changed, true);
    assert.equal(wrapperStyle?.widthMode, "hug");
    assert.equal(changes[0]?.axis, "width");
  });

  it("横排 hug 高、无兄弟锚点时子级 height fill 回落 hug", () => {
    const parent = createLayoutParent({
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "hug",
    });
    const template = templateWithChildren(parent, {
      child: {
        id: "child",
        type: "image",
        parentId: "parent",
        children: [],
        wrapperStyle: { widthMode: "fixed", width: "130px", heightMode: "fill", height: "130px" },
        props: {},
        bindings: {},
      },
    });
    const { wrapperStyle, changed, changes } = normalizeBlockWrapperDimensionModes(
      template,
      "child"
    );
    assert.equal(changed, true);
    assert.equal(wrapperStyle?.heightMode, "hug");
    assert.equal(changes[0]?.axis, "height");
  });

  it("横排 hug 高、有兄弟锚点时保留子级 height fill", () => {
    const parent = createLayoutParent({
      id: "row",
      direction: "horizontal",
      widthMode: "fill",
      heightMode: "hug",
      children: ["imageLeft", "stackRight"],
    });
    const template = templateWithChildren(parent, {
      imageLeft: {
        id: "imageLeft",
        type: "image",
        parentId: "row",
        children: [],
        wrapperStyle: {
          widthMode: "fixed",
          width: "130px",
          heightMode: "fill",
        },
        props: {},
        bindings: {},
      },
      stackRight: {
        id: "stackRight",
        type: "layout",
        parentId: "row",
        children: ["txt"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gap: "0" },
        bindings: {},
      },
      txt: {
        id: "txt",
        type: "text",
        parentId: "stackRight",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { text: "quote" },
        bindings: {},
      },
    });
    const { changed, wrapperStyle } = normalizeBlockWrapperDimensionModes(template, "imageLeft");
    assert.equal(changed, false);
    assert.equal(wrapperStyle?.heightMode, "fill");
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
    const template = { blocks: { btn: button } } as unknown as EmailTemplate;
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
    assert.equal(getFillOptionTitle("width", true), "父级 hug 且同级无宽度锚点时不可用");
    assert.match(getFillValidationReason("width"), /width fill/);
  });

  it("高度轴禁用时返回一致文案", () => {
    assert.match(getWrapperModeHint("height", true), /循环依赖/);
    assert.equal(getFillOptionTitle("height", true), "父级 hug 且同级无高度锚点时不可用");
    assert.match(getFillValidationReason("height"), /height fill/);
  });
});
