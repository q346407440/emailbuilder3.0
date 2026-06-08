import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bindPathForInlineField,
  classifyValidationIssue,
  countValidationIssueSeverity,
  isMaterializedIntermediateWarning,
  parseValidationIssuePath,
} from "./validationIssueRouting";

describe("validationIssueRouting", () => {
  it("解析 blocks.props 与 layout 前缀", () => {
    const p = parseValidationIssuePath("blocks.btn-1.props.backgroundColor");
    assert.equal(p.blockId, "btn-1");
    assert.equal(bindPathForInlineField(p), "props.backgroundColor");

    const cross = parseValidationIssuePath("layout:variant-b/payload.values.slotA");
    assert.equal(cross.layoutVariantId, "variant-b");
    assert.equal(cross.slotId, "slotA");
  });

  it("物化中间态 warning 计入建议计数", () => {
    const issue = {
      path: "blocks.x.bindings.y.slotPath",
      reason: "collection 列表项字段（带数字下标的 slotPath）只能写在列表重复行模板内",
      level: "warning" as const,
    };
    assert.equal(isMaterializedIntermediateWarning(issue), true);
    const counts = countValidationIssueSeverity([issue]);
    assert.equal(counts.blocking, 0);
    assert.equal(counts.warning, 1);
  });

  it("theme 绑定 issue 归类为 inlineField", () => {
    const c = classifyValidationIssue({
      path: "blocks.root.props.backgroundColor",
      reason: '字段值含 $themeRef 但 block.bindings.props.backgroundColor 未登记 mode:"theme"',
    });
    assert.equal(c.tier, "inlineField");
    assert.equal(c.inspectorTab, "style");
  });
});
