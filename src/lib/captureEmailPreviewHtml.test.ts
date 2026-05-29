import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wrapEmailPreviewDocument } from "./captureEmailPreviewHtml";

describe("wrapEmailPreviewDocument", () => {
  it("包含版心宽度与预览片段", () => {
    const html = wrapEmailPreviewDocument("<div>预览</div>", {
      subject: "测试主题",
      preheader: "摘要",
    });
    assert.match(html, /600px/);
    assert.match(html, /<div>预览<\/div>/);
    assert.match(html, /测试主题/);
    assert.match(html, /摘要/);
  });
});
