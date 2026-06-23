import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { astToTemplate } from "./astToTemplate";
import type { RestoreAstDocument } from "./types";

const theme = {
  colors: { primary: "#111", accent: "#222", secondary: "#888", surface: "#fff" },
  spacing: { section: "16px", gap: "8px", pageInline: "12px" },
  typography: { display: "32px", h1: "22px", body: "14px", caption: "12px" },
  radius: { panel: "8px", cta: "24px" },
};

describe("容器 align 继承", () => {
  test("父 stack align:start 时，子 row 与 text 未写 align → 左对齐", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "模块",
            align: "start",
            box: { pad: "section" },
            gap: "gap",
            children: [
              { t: "text", content: "标题", role: "h1" },
              {
                t: "row",
                title: "徽章行",
                gap: "gap",
                children: [
                  {
                    t: "image",
                    query: "app-store-badge",
                    height: { px: 40 },
                    aspect: { w: 135, h: 40 },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, { idPrefix: "t" });
    const stackId = Object.keys(template.blocks).find((id) => id.includes("stack-1"))!;
    const textId = Object.keys(template.blocks).find((id) => id.includes("text-1"))!;
    const rowId = Object.keys(template.blocks).find((id) => id.includes("row-1"))!;

    assert.equal(template.blocks[stackId]!.wrapperStyle?.contentAlign?.horizontal, "left");
    assert.equal(template.blocks[textId]!.wrapperStyle?.contentAlign?.horizontal, "left");
    assert.equal(template.blocks[rowId]!.wrapperStyle?.contentAlign?.horizontal, "left");
  });

  test("text.align 仅在不同于父 stack 时覆盖", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "模块",
            align: "center",
            gap: "gap",
            children: [
              { t: "text", content: "居中标题", role: "h1" },
              { t: "text", content: "左对齐正文", role: "body", align: "start" },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, { idPrefix: "t" });
    const textIds = Object.keys(template.blocks).filter((id) => id.includes("text-"));
    const [titleId, bodyId] = textIds;

    assert.equal(template.blocks[titleId]!.wrapperStyle?.contentAlign?.horizontal, "center");
    assert.equal(template.blocks[bodyId]!.wrapperStyle?.contentAlign?.horizontal, "left");
  });

  test("父 row align:start 时，直接子 text 未写 align → 左对齐", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "模块",
            box: { pad: "section" },
            gap: "gap",
            children: [
              {
                t: "row",
                title: "横排行",
                align: "start",
                gap: "gap",
                children: [
                  {
                    t: "image",
                    query: "x",
                    height: { px: 80 },
                    aspect: { w: 1, h: 1 },
                  },
                  { t: "text", content: "附属文案", role: "body" },
                ],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, { idPrefix: "t" });
    const textId = Object.keys(template.blocks).find((id) => id.includes("text-1"))!;
    assert.equal(template.blocks[textId]!.wrapperStyle?.contentAlign?.horizontal, "left");
    assert.equal(template.blocks[textId]!.wrapperStyle?.widthMode, "fill");
  });

  test("row 内子 stack 未写 align 时继承 row 主轴", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "模块",
            gap: "gap",
            children: [
              {
                t: "row",
                title: "横排行",
                align: "start",
                gap: "gap",
                children: [
                  {
                    t: "image",
                    query: "x",
                    height: { px: 80 },
                    aspect: { w: 1, h: 1 },
                  },
                  {
                    t: "stack",
                    title: "文案列",
                    gap: "gap",
                    children: [{ t: "text", content: "主文案", role: "body" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, { idPrefix: "t" });
    const innerStackId = Object.keys(template.blocks).find((id) => id.includes("stack-2"))!;
    const textId = Object.keys(template.blocks).find((id) => id.includes("text-1"))!;
    assert.equal(template.blocks[innerStackId]!.wrapperStyle?.contentAlign?.horizontal, "left");
    assert.equal(template.blocks[textId]!.wrapperStyle?.contentAlign?.horizontal, "left");
  });
});

describe("between 横排子级 widthMode", () => {
  test("align:between 时直接子 text → hug + gapMode auto", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "头部导航区",
            align: "start",
            box: { pad: "section" },
            children: [
              {
                t: "row",
                title: "导航栏",
                align: "between",
                crossAlign: "center",
                children: [
                  { t: "text", content: "SKILL SHARE.", role: "h1", bold: true },
                  { t: "text", content: "View in Browser", role: "caption", tone: "secondary" },
                ],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, { idPrefix: "t" });
    const rowId = Object.keys(template.blocks).find((id) => id.includes("row-1"))!;
    const textIds = Object.keys(template.blocks).filter((id) => id.includes("text-"));

    assert.equal(template.blocks[rowId]!.props?.gapMode, "auto");
    for (const textId of textIds) {
      assert.equal(template.blocks[textId]!.wrapperStyle?.widthMode, "hug");
    }
  });

  test("align:between 时通栏 button 直子保留 fill wrapper", () => {
    const doc: RestoreAstDocument = {
      theme,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "模块",
            box: { pad: "section" },
            children: [
              {
                t: "row",
                title: "行动行",
                align: "between",
                crossAlign: "center",
                children: [
                  { t: "text", content: "左侧", role: "body" },
                  { t: "button", label: "通栏 CTA", width: "fill" },
                ],
              },
            ],
          },
        ],
      },
    };

    const { template } = astToTemplate(doc, { idPrefix: "t" });
    const textId = Object.keys(template.blocks).find((id) => id.includes("text-1"))!;
    const btnId = Object.keys(template.blocks).find((id) => id.includes("btn-1"))!;

    assert.equal(template.blocks[textId]!.wrapperStyle?.widthMode, "hug");
    assert.equal(template.blocks[btnId]!.wrapperStyle?.widthMode, "fill");
  });
});
