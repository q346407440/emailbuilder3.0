import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHtmlToTextBody, renderTextBodyToHtml } from "./textBodyFormat";

describe("parseHtmlToTextBody — 清除格式与区块默认", () => {
  it("区块默认加粗时，无标签文字应落盘 bold:false 并在预览中取消加粗", { skip: typeof DOMParser === "undefined" }, () => {
    const defaults = { bold: true, italic: false, decoration: "none" as const };
    const html =
      '<p style="margin:0;padding:0"><strong>BOLD</strong> normal</p>';
    const body = parseHtmlToTextBody(html, defaults);
    const runs = body.paragraphs[0]?.runs ?? [];
    assert.equal(runs.length, 2);
    assert.equal(runs[0]?.bold, undefined);
    assert.equal(runs[0]?.text, "BOLD");
    assert.equal(runs[1]?.bold, false);
    assert.equal(runs[1]?.text, " normal");

    const rendered = renderTextBodyToHtml(body, defaults);
    assert.match(rendered, /<strong>BOLD<\/strong>/);
    assert.doesNotMatch(rendered, /<strong>[^<]*normal/);
  });

  it("清除字色后应去掉 run.color，回退区块默认色", { skip: typeof DOMParser === "undefined" }, () => {
    const defaults = {
      bold: false,
      italic: false,
      decoration: "none" as const,
      color: "#111827",
    };
    const html =
      '<p style="margin:0;padding:0"><span style="color:#9CA3AF">gray</span> dark</p>';
    const body = parseHtmlToTextBody(html, defaults);
    const runs = body.paragraphs[0]?.runs ?? [];
    assert.equal(runs[0]?.color, "#9CA3AF");
    assert.equal(runs[1]?.color, undefined);

    const cleared = parseHtmlToTextBody(
      '<p style="margin:0;padding:0">gray dark</p>',
      defaults
    );
    const clearedRuns = cleared.paragraphs[0]?.runs ?? [];
    assert.equal(clearedRuns[0]?.color, undefined);
  });

  it("run 文本内含换行符时应渲染为 <br/>", () => {
    const defaults = { bold: false, italic: false, decoration: "none" as const };
    const rendered = renderTextBodyToHtml(
      {
        paragraphs: [{ runs: [{ text: "上行\n下行" }] }],
      },
      defaults
    );
    assert.match(rendered, /上行<br\/>下行/);
  });
});
