import assert from "node:assert/strict";
import { test } from "node:test";
import { astToTemplate } from "./astToTemplate";
import type { RestoreAstDocument } from "./types";

const theme: RestoreAstDocument["theme"] = {
  colors: { primary: "#111", accent: "#222", secondary: "#333", surface: "#fff" },
  spacing: { section: "24px", gap: "12px", pageInline: "20px" },
  typography: { display: "30px", h1: "20px", body: "14px", caption: "11px" },
  radius: { panel: "8px", cta: "999px" },
};

function findImageHeights(template: ReturnType<typeof astToTemplate>["template"]): string[] {
  const heights: string[] = [];
  for (const block of Object.values(template.blocks)) {
    if (block.type === "image" && block.wrapperStyle?.height) {
      heights.push(String(block.wrapperStyle.height));
    }
  }
  return heights;
}

test("grid.cellImageHeight 统一格内 image 高度，忽略各 image.height", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "grid",
          title: "宫格",
          columns: 2,
          cellImageHeight: { px: 100 },
          children: [
            {
              t: "stack",
              title: "卡A",
              children: [{ t: "image", query: "product a", height: { px: 50 } }],
            },
            {
              t: "stack",
              title: "卡B",
              children: [{ t: "image", query: "product b" }],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "t",
  });

  assert.deepEqual(findImageHeights(template), ["100px", "100px"]);
});

test("grid 未写 cellImageHeight 时各 image 用自身 height", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "grid",
          title: "宫格",
          columns: 2,
          children: [
            {
              t: "stack",
              title: "卡A",
              children: [{ t: "image", query: "product a", height: { px: 80 } }],
            },
            {
              t: "stack",
              title: "卡B",
              children: [{ t: "image", query: "product b", height: { px: 120 } }],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "t",
  });

  assert.deepEqual(findImageHeights(template), ["80px", "120px"]);
});

test("嵌套 grid 未写 cellImageHeight 时不继承外层 grid 高度", () => {
  const doc: RestoreAstDocument = {
    theme,
    tree: {
      t: "email",
      children: [
        {
          t: "grid",
          title: "外层",
          columns: 1,
          cellImageHeight: { px: 160 },
          children: [
            {
              t: "grid",
              title: "内层",
              columns: 1,
              children: [
                {
                  t: "stack",
                  title: "卡",
                  children: [{ t: "image", query: "product", height: { px: 90 } }],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, {
    emailId: "test",
    templateId: "test",
    locale: "en-US",
    idPrefix: "t",
  });

  assert.deepEqual(findImageHeights(template), ["90px"]);
});
