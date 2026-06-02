import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { normalizeButtonContentAlign } from "./buttonContentAlign";
import { validateTemplate } from "./validate";

function buildButtonTemplate(wrapperStyle: Record<string, unknown>): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["btn"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          width: "600px",
          backgroundColor: "#fff",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      btn: {
        id: "btn",
        type: "button",
        parentId: "root",
        children: [],
        wrapperStyle: wrapperStyle as EmailTemplate["blocks"][string]["wrapperStyle"],
        props: {
          text: "Go",
          link: "https://example.com",
          buttonStyle: {
            backgroundColor: "#111",
            textColor: "#fff",
            fontSize: "14px",
            border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
            borderRadius: { mode: "unified", radius: "4px" },
            bold: false,
            italic: false,
          },
        },
        bindings: {},
      },
    },
  };
}

describe("normalizeButtonContentAlign", () => {
  it("缺失 horizontal 时补齐 left", () => {
    const block = buildButtonTemplate({
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: { vertical: "top" },
    }).blocks.btn;
    assert.equal(normalizeButtonContentAlign(block), true);
    assert.equal(block.wrapperStyle?.contentAlign?.horizontal, "left");
  });

  it("已有合法 horizontal 时不改动", () => {
    const block = buildButtonTemplate({
      widthMode: "hug",
      heightMode: "hug",
      contentAlign: { horizontal: "center", vertical: "top" },
    }).blocks.btn;
    assert.equal(normalizeButtonContentAlign(block), false);
    assert.equal(block.wrapperStyle?.contentAlign?.horizontal, "center");
  });
});

describe("validateTemplate · button contentAlign", () => {
  it("缺失 contentAlign 时命中必填校验", () => {
    const tpl = buildButtonTemplate({
      widthMode: "fill",
      heightMode: "hug",
    });
    const issues = validateTemplate(tpl);
    assert.ok(issues.some((i) => i.path === "blocks.btn.wrapperStyle.contentAlign"));
  });

  it("contentAlign.horizontal 合法时通过", () => {
    const tpl = buildButtonTemplate({
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: { horizontal: "center", vertical: "top" },
    });
    const issues = validateTemplate(tpl);
    assert.equal(issues.some((i) => i.path.includes("contentAlign")), false);
  });
});
