import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateVisibilityRule } from "../visibility-contract";
import {
  buildVisibilitySlotCandidates,
  findVisibilitySlotCandidate,
  visibilityRuleFromCandidate,
} from "./visibilitySlotCandidates";

describe("buildVisibilitySlotCandidates", () => {
  it("对象变量展开为各标量字段候选", () => {
    const rows = buildVisibilitySlotCandidates([
      { slotId: "storeUrl", valueType: "url", label: "店铺链接" },
      {
        slotId: "loyaltyPlan",
        valueType: "object",
        label: "推荐订阅套餐",
        objectFields: [
          { key: "title", label: "标题", valueType: "string", required: true },
          { key: "enabled", label: "是否启用", valueType: "string", required: true },
        ],
      },
    ]);
    assert.deepEqual(
      rows.map((row) => row.key).sort(),
      ["loyaltyPlan::enabled", "loyaltyPlan::title", "storeUrl"].sort()
    );
    assert.equal(rows.find((row) => row.key === "loyaltyPlan::title")?.valueType, "string");
    assert.equal(rows.find((row) => row.key === "loyaltyPlan::title")?.objectFieldKey, "title");
  });
});

describe("evaluateVisibilityRule · object field", () => {
  it("按 objectFieldKey 读取对象槽内字段求值", () => {
    const candidate = buildVisibilitySlotCandidates([
      {
        slotId: "loyaltyPlan",
        valueType: "object",
        label: "推荐订阅套餐",
        objectFields: [{ key: "title", label: "标题", valueType: "string", required: true }],
      },
    ]).find((row) => row.key === "loyaltyPlan::title");
    assert.ok(candidate);
    const rule = visibilityRuleFromCandidate(candidate!);
    rule.operator = "isNotEmpty";

    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {},
      values: {
        loyaltyPlan: { title: "Pro 套餐" },
      },
    };
    assert.equal(evaluateVisibilityRule(rule, payload), true);
    assert.equal(
      evaluateVisibilityRule(rule, { ...payload, values: { loyaltyPlan: { title: "" } } }),
      false
    );
    assert.equal(
      evaluateVisibilityRule(rule, { ...payload, values: { loyaltyPlan: {} } }),
      false
    );
  });

  it("findVisibilitySlotCandidate 可回显对象字段规则", () => {
    const candidates = buildVisibilitySlotCandidates([
      {
        slotId: "loyaltyPlan",
        valueType: "object",
        label: "推荐订阅套餐",
        objectFields: [{ key: "title", label: "标题", valueType: "string", required: true }],
      },
    ]);
    const rule = {
      slotId: "loyaltyPlan",
      valueType: "string" as const,
      operator: "isNotEmpty" as const,
      objectFieldKey: "title",
    };
    assert.equal(findVisibilitySlotCandidate(candidates, rule)?.label, "推荐订阅套餐 · 标题");
  });
});
