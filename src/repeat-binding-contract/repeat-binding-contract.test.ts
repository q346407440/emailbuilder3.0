import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPEAT_BINDING_RULES, REPEAT_BINDING_RULE_IDS } from "./rules";
import { REPEAT_HOST_BLOCK_TYPES, REPEAT_NESTING_DEPTH_MAX } from "./values";
import { isRepeatHostBlockType } from "../lib/repeatHostBlock";
import { REPEAT_NESTING_DEPTH_MAX as validateNestingMax } from "../lib/validate";

describe("repeat-binding-contract", () => {
  it("规则 id 唯一且与目录一致", () => {
    assert.equal(REPEAT_BINDING_RULES.length, REPEAT_BINDING_RULE_IDS.length);
    assert.equal(new Set(REPEAT_BINDING_RULE_IDS).size, REPEAT_BINDING_RULE_IDS.length);
  });

  it("宿主类型与 repeatHostBlock 一致", () => {
    for (const type of REPEAT_HOST_BLOCK_TYPES) {
      assert.equal(isRepeatHostBlockType(type), true);
    }
    assert.equal(isRepeatHostBlockType("text"), false);
    assert.equal(isRepeatHostBlockType("emailRoot"), false);
  });

  it("嵌套深度上限与 validate 导出一致", () => {
    assert.equal(validateNestingMax, REPEAT_NESTING_DEPTH_MAX);
  });

  it("repeat.runtime.virtualView 规则存在", () => {
    assert.ok(REPEAT_BINDING_RULE_IDS.includes("repeat.runtime.virtualView"));
  });

  it("repeat.selection.expansionGroup 规则存在", () => {
    assert.ok(REPEAT_BINDING_RULE_IDS.includes("repeat.selection.expansionGroup"));
  });

  it("self-repeat 与绑定向导规则存在", () => {
    assert.ok(REPEAT_BINDING_RULE_IDS.includes("repeat.selfRepeat.prototypeChildIds"));
    assert.ok(REPEAT_BINDING_RULE_IDS.includes("repeat.bindWizard.fieldMapping.scalarsOnly"));
    assert.ok(REPEAT_BINDING_RULE_IDS.includes("repeat.bindWizard.slotCandidates"));
    assert.ok(REPEAT_BINDING_RULE_IDS.includes("repeat.host.selectionRequired"));
  });
});
