import assert from "node:assert/strict";
import test from "node:test";
import { getRenderDefaultRule, listRenderDefaultRulesByKind, RENDER_DEFAULT_RULE_IDS } from "./index";
import { projectLayoutContentAlign } from "./values";

test("RENDER_DEFAULT_RULE_IDS 无重复", () => {
  assert.equal(new Set(RENDER_DEFAULT_RULE_IDS).size, RENDER_DEFAULT_RULE_IDS.length);
});

test("底图 padding 特殊语义规则存在", () => {
  const rule = getRenderDefaultRule("semantic.backgroundPadding");
  assert.ok(rule);
  assert.equal(rule?.kind, "specialSemantic");
  assert.match(rule?.summary ?? "", /叠放/);
  assert.ok(rule?.blockTypes?.includes("emailRoot"));
  assert.match(rule?.jsonPath ?? "", /props\.padding/);
});

test("forbidden 与 injected 规则均非空", () => {
  assert.ok(listRenderDefaultRulesByKind("forbiddenInJson").length >= 8);
  assert.ok(listRenderDefaultRulesByKind("injectedAtRender").length >= 6);
  assert.ok(listRenderDefaultRulesByKind("specialSemantic").length >= 2);
});

test("projectLayoutContentAlign 按排列方向读取主轴", () => {
  assert.deepEqual(projectLayoutContentAlign("horizontal", { horizontal: "center", vertical: "bottom" }), {
    horizontal: "center",
    vertical: "top",
  });
  assert.deepEqual(projectLayoutContentAlign("vertical", { horizontal: "right", vertical: "center" }), {
    horizontal: "left",
    vertical: "center",
  });
  assert.deepEqual(projectLayoutContentAlign("vertical", undefined), {
    horizontal: "left",
    vertical: "top",
  });
});
