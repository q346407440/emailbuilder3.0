import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate, TextBlock } from "../types/email";
import { validateTemplate } from "./validate";

function minimalTextTemplate(textBody: TextBlock["props"]["textBody"]): EmailTemplate {
  const text: TextBlock = {
    id: "txt",
    type: "text",
    parentId: "root",
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: { horizontal: "left", vertical: "top" },
    },
    props: {
      textBody,
      fontSize: "16px",
      color: "#374151",
      bold: false,
      italic: false,
      decoration: "none",
    },
  };
  return {
    schemaVersion: "3.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["txt"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      txt: text,
    },
    blockMeta: {
      root: { blockType: "email.root", name: "根" },
      txt: { blockType: "content.text", name: "文" },
    },
  };
}

describe("validate textBody run color/fontSize", () => {
  it("run.color 含 $themeRef 应失败", () => {
    const issues = validateTemplate(
      minimalTextTemplate({
        paragraphs: [{ runs: [{ text: "x", color: { $themeRef: "colors.primary" } as unknown as string }] }],
      })
    );
    assert.ok(
      issues.some((i) => i.path.includes("runs[0].color") && i.reason.includes("$themeRef")),
      issues.map((i) => `${i.path}: ${i.reason}`).join("; ")
    );
  });

  it("bindings 对 run.color 使用 theme 应失败", () => {
    const t = minimalTextTemplate({
      paragraphs: [{ runs: [{ text: "x", color: "#111827" }] }],
    });
    const block = t.blocks.txt as TextBlock;
    block.bindings = {
      "props.textBody.paragraphs.0.runs.0.color": {
        fieldKind: "style",
        mode: "theme",
        slotId: "colors.primary",
        tokenPath: "colors.primary",
      },
    };
    const issues = validateTemplate(t);
    assert.ok(
      issues.some(
        (i) =>
          i.path.includes("runs.0.color") &&
          (i.reason.includes("结构性") ||
            i.reason.includes("主题绑定") ||
            i.reason.includes("字段分类不一致"))
      ),
      issues.map((i) => `${i.path}: ${i.reason}`).join("; ")
    );
  });
});
