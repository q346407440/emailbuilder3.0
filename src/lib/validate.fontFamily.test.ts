import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { validateTemplate } from "./validate";

function minimalTextTemplate(fontFamily: unknown): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "font-test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["t1"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          width: "600px",
          backgroundColor: "#ffffff",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      t1: {
        id: "t1",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          content: "<p>x</p>",
          textBody: { version: 1, paragraphs: [{ runs: [{ text: "x" }] }] },
          fontFamily,
          fontSize: "15px",
          color: "#111827",
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {},
      },
    },
  };
}

describe("validateTemplate · 单一主字体", () => {
  it("拒绝 text.props.fontFamily 写入 CSS 字体栈", () => {
    const issues = validateTemplate(minimalTextTemplate("Arial, sans-serif"));
    assert.ok(
      issues.some(
        (i) => i.path === "blocks.t1.props.fontFamily" && i.reason.includes("单一主字体")
      )
    );
  });

  it("允许单一主字体字面量", () => {
    const issues = validateTemplate(minimalTextTemplate("Arial"));
    assert.equal(
      issues.some((i) => i.path === "blocks.t1.props.fontFamily" && i.reason.includes("单一主字体")),
      false
    );
  });

  it("允许 $themeRef 绑定 fonts.*", () => {
    const issues = validateTemplate(
      minimalTextTemplate({ $themeRef: "fonts.body" })
    );
    assert.equal(
      issues.some((i) => i.path === "blocks.t1.props.fontFamily" && i.reason.includes("单一主字体")),
      false
    );
  });
});
