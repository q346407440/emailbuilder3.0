import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectTextBodyVariableRuns,
  parseEditorHtmlToTextBody,
  renderTextBodyToEditorHtml,
  TEXT_BODY_VAR_PILL_BIND_ATTR,
  TEXT_BODY_VAR_PILL_CLASS,
  TEXT_BODY_VAR_PILL_INNER_LINK_CLASS,
} from "./textBodyEditorFormat";
import type { TextBody } from "../types/email";

const defaults = {
  bold: false,
  italic: false,
  decoration: "none" as const,
  color: "#111827",
  fontSize: "16px",
};

const sampleBody: TextBody = {
  paragraphs: [
    {
      runs: [
        { text: "contact " },
        { text: "zyzshop1", link: "https://example.com/store", decoration: "underline" },
        { text: " team" },
      ],
    },
  ],
};

describe("textBodyEditorFormat", () => {
  it("collectTextBodyVariableRuns 合并同 run 的 text/link 绑定", () => {
    const bindings = {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "storeName",
        mode: "variable" as const,
        valueType: "string" as const,
        defaultValue: "zyzshop1",
        allowExternal: true,
        fieldKind: "content" as const,
        label: "店铺名称",
      },
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "storeUrl",
        mode: "variable" as const,
        valueType: "url" as const,
        defaultValue: "https://example.com/store",
        allowExternal: true,
        fieldKind: "content" as const,
        label: "店铺链接",
      },
    };
    const runs = collectTextBodyVariableRuns(sampleBody, bindings, (path) => {
      if (path.endsWith(".text")) return "My Store";
      if (path.endsWith(".link")) return "https://shop.test";
      return "";
    });
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.displayText, "My Store");
    assert.equal(runs[0]?.displayLink, "https://shop.test");
    assert.equal(runs[0]?.linkBindPath, "props.textBody.paragraphs.0.runs.1.link");
  });

  it("displayLink 在 resolveDisplay 为空时回退 run 模板字面量 link", () => {
    const bindings = {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "storeName",
        mode: "variable" as const,
        valueType: "string" as const,
        defaultValue: "zyzshop1",
        allowExternal: true,
        fieldKind: "content" as const,
      },
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "storeUrl",
        mode: "variable" as const,
        valueType: "url" as const,
        defaultValue: "https://example.com/store",
        allowExternal: true,
        fieldKind: "content" as const,
      },
    };
    const runs = collectTextBodyVariableRuns(sampleBody, bindings, () => "");
    assert.equal(runs[0]?.displayLink, "https://example.com/store");
  });

  it("renderTextBodyToEditorHtml 为 variable run 输出胶囊且带链接样式", () => {
    const meta = collectTextBodyVariableRuns(
      sampleBody,
      {
        "props.textBody.paragraphs.0.runs.1.text": {
          slotId: "storeName",
          mode: "variable",
          valueType: "string",
          defaultValue: "zyzshop1",
          allowExternal: true,
          fieldKind: "content",
        },
        "props.textBody.paragraphs.0.runs.1.link": {
          slotId: "storeUrl",
          mode: "variable",
          valueType: "url",
          defaultValue: "https://example.com/store",
          allowExternal: true,
          fieldKind: "content",
        },
      },
      (path) => (path.endsWith(".text") ? "My Store" : "https://shop.test")
    );
    const html = renderTextBodyToEditorHtml(sampleBody, defaults, meta);
    assert.ok(html.includes(`<span class="${TEXT_BODY_VAR_PILL_CLASS}"`));
    assert.ok(html.includes(`<a href="https://shop.test" class="${TEXT_BODY_VAR_PILL_INNER_LINK_CLASS}">My Store</a>`));
    assert.ok(html.includes('contenteditable="false"'));
    assert.ok(html.includes(`${TEXT_BODY_VAR_PILL_BIND_ATTR}="props.textBody.paragraphs.0.runs.1.text"`));
    assert.ok(html.includes('contenteditable="false"'));
  });

  it("parseEditorHtmlToTextBody 保留 variable run 模板字面量", { skip: typeof DOMParser === "undefined" }, () => {
    const bindings = {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "storeName",
        mode: "variable" as const,
        valueType: "string" as const,
        defaultValue: "zyzshop1",
        allowExternal: true,
        fieldKind: "content" as const,
      },
    };
    const meta = collectTextBodyVariableRuns(sampleBody, bindings, () => "DISPLAY_ONLY");
    const html = renderTextBodyToEditorHtml(sampleBody, defaults, meta);
    const parsed = parseEditorHtmlToTextBody(html, defaults, sampleBody, meta);
    assert.equal(parsed.paragraphs[0]?.runs[1]?.text, "zyzshop1");
    assert.equal(parsed.paragraphs[0]?.runs[1]?.link, "https://example.com/store");
  });

  it("parseEditorHtmlToTextBody 保留 run 级字色与字号", { skip: typeof DOMParser === "undefined" }, () => {
    const html = `<p><span style="color:#ff1f1f;font-size:18px">高亮</span>文本</p>`;
    const parsed = parseEditorHtmlToTextBody(html, defaults, { paragraphs: [{ runs: [] }] }, []);
    assert.equal(parsed.paragraphs[0]?.runs[0]?.text, "高亮");
    assert.equal(parsed.paragraphs[0]?.runs[0]?.color, "rgb(255, 31, 31)");
    assert.equal(parsed.paragraphs[0]?.runs[0]?.fontSize, "18px");
    assert.equal(parsed.paragraphs[0]?.runs[1]?.text, "文本");
    assert.equal(parsed.paragraphs[0]?.runs[1]?.color, undefined);
  });
});
