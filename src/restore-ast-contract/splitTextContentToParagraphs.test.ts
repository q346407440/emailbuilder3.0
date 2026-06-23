import assert from "node:assert/strict";
import test from "node:test";
import { astToTemplate } from "./astToTemplate";
import { splitTextContentToParagraphs } from "./splitTextContentToParagraphs";
import type { RestoreAstDocument } from "./types";

test("splitTextContentToParagraphs：无换行 → 单段", () => {
  assert.deepEqual(splitTextContentToParagraphs("单行", {}), [{ runs: [{ text: "单行" }] }]);
});

test("splitTextContentToParagraphs：\\n → 多段", () => {
  assert.deepEqual(splitTextContentToParagraphs("上行\n下行", { bold: true }), [
    { runs: [{ text: "上行", bold: true }] },
    { runs: [{ text: "下行", bold: true }] },
  ]);
});

test("splitTextContentToParagraphs：\\r\\n 归一化", () => {
  assert.deepEqual(splitTextContentToParagraphs("A\r\nB", {}), [
    { runs: [{ text: "A" }] },
    { runs: [{ text: "B" }] },
  ]);
});

test("astToTemplate：text.content 含 \\n → 多 paragraphs", () => {
  const doc: RestoreAstDocument = {
    theme: {
      colors: { primary: "#111", accent: "#222", secondary: "#888", surface: "#fff" },
      spacing: { section: "16px", gap: "8px", pageInline: "12px" },
      typography: { display: "32px", h1: "22px", body: "14px", caption: "12px" },
      radius: { panel: "8px", cta: "24px" },
    },
    tree: {
      t: "email",
      children: [
        {
          t: "stack",
          title: "模块",
          align: "start",
          box: { pad: "section" },
          children: [
            {
              t: "text",
              content: "上行\n下行",
              role: "h1",
              bold: true,
            },
          ],
        },
      ],
    },
  };

  const { template } = astToTemplate(doc, { idPrefix: "t" });
  const textId = Object.keys(template.blocks).find((id) => id.includes("text-1"))!;
  const paragraphs = template.blocks[textId]!.props?.textBody?.paragraphs;

  assert.equal(paragraphs?.length, 2);
  assert.equal(paragraphs?.[0]?.runs?.[0]?.text, "上行");
  assert.equal(paragraphs?.[1]?.runs?.[0]?.text, "下行");
  assert.equal(paragraphs?.[0]?.runs?.[0]?.bold, true);
});
