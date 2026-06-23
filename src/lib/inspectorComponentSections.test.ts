import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasInspectorComponentSection,
  inspectorComponentSections,
} from "./inspectorComponentSections";

describe("inspectorComponentSections", () => {
  it("文本仅有内容与样式", () => {
    assert.deepEqual(inspectorComponentSections("text"), ["content", "style"]);
    assert.equal(hasInspectorComponentSection("text", "layout"), false);
  });

  it("按钮含布局", () => {
    assert.equal(hasInspectorComponentSection("button", "layout"), true);
  });

  it("分割线仅有样式", () => {
    assert.deepEqual(inspectorComponentSections("divider"), ["style"]);
  });

  it("layout 含背景图内容段", () => {
    assert.deepEqual(inspectorComponentSections("layout"), ["content", "layout"]);
    assert.equal(hasInspectorComponentSection("layout", "content"), true);
  });

  it("未知类型回退内容段", () => {
    assert.deepEqual(inspectorComponentSections("unknown"), ["content"]);
  });
});
