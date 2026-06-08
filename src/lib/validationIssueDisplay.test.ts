import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatValidationIssueForDisplay,
  validationDockCollapsedLabel,
  validationSaveBlockedMessage,
} from "./validationIssueDisplay";

describe("validationIssueDisplay", () => {
  it("themeRef 未登记生成运营可读 summary", () => {
    const line = formatValidationIssueForDisplay(
      {
        path: "blocks.mcp27-ps-root.props.backgroundColor",
        reason:
          '字段值含 $themeRef 但 block.bindings.props.backgroundColor 未登记 mode:"theme"（来源胶囊体系约束）',
      },
      null
    );
    assert.match(line.summary, /主题样式/);
    assert.ok(line.detail.includes("blocks.mcp27-ps-root"));
  });

  it("Dock 收起文案", () => {
    assert.equal(validationDockCollapsedLabel(2, 1), "须修复 2 · 1 条建议");
    assert.equal(validationSaveBlockedMessage([{ path: "a", reason: "x" }]), "存在 1 项须修复的问题，请先处理后再保存。");
  });
});
