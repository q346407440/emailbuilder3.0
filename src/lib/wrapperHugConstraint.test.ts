import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailTemplate } from "../types/email";
import {
  blockProvidesDimensionAnchor,
  getHugValidationReason,
  isContainerHugBlockedByMissingChildAnchor,
  isHugConstraintContainer,
  normalizeContainerHugDimensionModes,
} from "./wrapperHugConstraint";

function layoutBlock(
  id: string,
  opts: {
    parentId?: string | null;
    children?: string[];
    widthMode?: "hug" | "fill" | "fixed";
    heightMode?: "hug" | "fill" | "fixed";
    width?: string;
    height?: string;
  }
): EmailBlock {
  return {
    id,
    type: "layout",
    parentId: opts.parentId ?? null,
    children: opts.children ?? [],
    wrapperStyle: {
      widthMode: opts.widthMode ?? "fill",
      heightMode: opts.heightMode ?? "hug",
      ...(opts.width ? { width: opts.width } : {}),
      ...(opts.height ? { height: opts.height } : {}),
    },
    props: { direction: "vertical", gap: "0" },
    bindings: {},
  };
}

function textBlock(id: string, parentId: string): EmailBlock {
  return {
    id,
    type: "text",
    parentId,
    children: [],
    wrapperStyle: { widthMode: "hug", heightMode: "hug" },
    props: { text: "hello" },
    bindings: {},
  };
}

function imageBlock(id: string, parentId: string, widthMode: "fill" | "fixed" = "fill"): EmailBlock {
  return {
    id,
    type: "image",
    parentId,
    children: [],
    wrapperStyle: {
      widthMode,
      heightMode: "fixed",
      ...(widthMode === "fixed" ? { width: "120px", height: "80px" } : { height: "80px" }),
    },
    props: {
      backgroundImage: { src: "https://example.com/a.png", fit: "cover" },
    },
    bindings: {},
  };
}

function templateOf(blocks: Record<string, EmailBlock>, rootId: string): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    emailId: "t",
    templateId: "t",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: rootId,
    blocks,
  };
}

describe("isHugConstraintContainer", () => {
  it("layout/grid/image/emailRoot 为容器", () => {
    assert.equal(isHugConstraintContainer({ type: "layout" } as EmailBlock), true);
    assert.equal(isHugConstraintContainer({ type: "grid" } as EmailBlock), true);
    assert.equal(isHugConstraintContainer({ type: "image" } as EmailBlock), true);
    assert.equal(isHugConstraintContainer({ type: "emailRoot" } as EmailBlock), true);
    assert.equal(isHugConstraintContainer({ type: "text" } as EmailBlock), false);
  });
});

describe("blockProvidesDimensionAnchor", () => {
  it("text hug 提供宽/高锚点", () => {
    const t = templateOf(
      {
        p: layoutBlock("p", { children: ["t"] }),
        t: textBlock("t", "p"),
      },
      "p"
    );
    assert.equal(blockProvidesDimensionAnchor(t, "t", "width"), true);
    assert.equal(blockProvidesDimensionAnchor(t, "t", "height"), true);
  });

  it("image fill 不提供宽度锚点；fixed 宽度提供", () => {
    const fillT = templateOf(
      {
        p: layoutBlock("p", { children: ["i"] }),
        i: imageBlock("i", "p", "fill"),
      },
      "p"
    );
    const fixedT = templateOf(
      {
        p: layoutBlock("p", { children: ["i"] }),
        i: imageBlock("i", "p", "fixed"),
      },
      "p"
    );
    assert.equal(blockProvidesDimensionAnchor(fillT, "i", "width"), false);
    assert.equal(blockProvidesDimensionAnchor(fixedT, "i", "width"), true);
  });

  it("image hug 但带定高 px 时仍提供高度锚点", () => {
    const t = templateOf(
      {
        p: layoutBlock("p", { children: ["i"] }),
        i: {
          ...imageBlock("i", "p", "fill"),
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            height: "220px",
          },
        },
      },
      "p"
    );
    assert.equal(blockProvidesDimensionAnchor(t, "i", "height"), true);
  });

  it("嵌套 hug layout 递归子级锚点", () => {
    const t = templateOf(
      {
        outer: layoutBlock("outer", { children: ["inner"], widthMode: "hug" }),
        inner: layoutBlock("inner", { parentId: "outer", children: ["t"], widthMode: "hug" }),
        t: textBlock("t", "inner"),
      },
      "outer"
    );
    assert.equal(blockProvidesDimensionAnchor(t, "inner", "width"), true);
  });
});

describe("isContainerHugBlockedByMissingChildAnchor", () => {
  it("空子级：默认不拦（编辑中间态）；Inspector 可显式拦", () => {
    const empty = templateOf({ p: layoutBlock("p", { widthMode: "hug", children: [] }) }, "p");
    assert.equal(isContainerHugBlockedByMissingChildAnchor(empty, "p", "width"), false);
    assert.equal(
      isContainerHugBlockedByMissingChildAnchor(empty, "p", "width", undefined, {
        blockEmptyChildren: true,
      }),
      true
    );
  });
  it("全 fill 子级时阻止宽度 hug", () => {
    const fillOnly = templateOf(
      {
        p: layoutBlock("p", { widthMode: "hug", children: ["i"] }),
        i: imageBlock("i", "p", "fill"),
      },
      "p"
    );
    assert.equal(isContainerHugBlockedByMissingChildAnchor(fillOnly, "p", "width"), true);
  });

  it("有 text 子级时不阻止 hug", () => {
    const t = templateOf(
      {
        p: layoutBlock("p", { widthMode: "hug", children: ["txt"] }),
        txt: textBlock("txt", "p"),
      },
      "p"
    );
    assert.equal(isContainerHugBlockedByMissingChildAnchor(t, "p", "width"), false);
  });
});

describe("normalizeContainerHugDimensionModes", () => {
  it("无锚点时宽度 hug 回落 fill", () => {
    const t = templateOf(
      {
        p: layoutBlock("p", { widthMode: "hug", heightMode: "fill", children: ["i"] }),
        i: imageBlock("i", "p", "fill"),
      },
      "p"
    );
    const result = normalizeContainerHugDimensionModes(t, "p");
    assert.equal(result.changed, true);
    assert.equal(result.wrapperStyle?.widthMode, "fill");
    assert.equal(result.wrapperStyle?.heightMode, "fill");
    assert.equal(result.changes.length, 1);
    assert.equal(result.changes[0]?.axis, "width");
  });

  it("有锚点时保持 hug", () => {
    const t = templateOf(
      {
        p: layoutBlock("p", { widthMode: "hug", heightMode: "hug", children: ["txt"] }),
        txt: textBlock("txt", "p"),
      },
      "p"
    );
    const result = normalizeContainerHugDimensionModes(t, "p");
    assert.equal(result.changed, false);
  });
});

describe("getHugValidationReason", () => {
  it("包含宽度/高度轴文案", () => {
    assert.match(getHugValidationReason("width"), /宽度/);
    assert.match(getHugValidationReason("height"), /高度/);
  });
});
