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

test("栅格矩阵槽 contentAlign 特殊语义规则存在", () => {
  const rule = getRenderDefaultRule("semantic.gridMatrixSlotVerticalAlign");
  assert.ok(rule);
  assert.match(rule?.summary ?? "", /矩阵格/);
});

test("底图描边与定高 table 特殊语义规则存在", () => {
  const borderRule = getRenderDefaultRule("semantic.backgroundImageOverlayBorder");
  assert.ok(borderRule);
  assert.match(borderRule?.summary ?? "", /底图承载/);

  const tableRule = getRenderDefaultRule("semantic.backgroundImageFixedHeightTable");
  assert.ok(tableRule);
  assert.match(tableRule?.summary ?? "", /border-collapse/);
});

test("forbidden 与 injected 规则均非空", () => {
  assert.ok(listRenderDefaultRulesByKind("forbiddenInJson").length >= 8);
  assert.ok(listRenderDefaultRulesByKind("injectedAtRender").length >= 6);
  assert.ok(listRenderDefaultRulesByKind("specialSemantic").length >= 2);
});

test("发信导出 hug 盒烘焙规则存在", () => {
  const rule = getRenderDefaultRule("semantic.deliveryExportMeasuredBox");
  assert.ok(rule);
  assert.equal(rule?.kind, "specialSemantic");
  assert.match(rule?.summary ?? "", /hug/);
});

test("projectLayoutContentAlign 显式值透传、缺失回退 left/top", () => {
  assert.deepEqual(projectLayoutContentAlign("horizontal", { horizontal: "center", vertical: "bottom" }), {
    horizontal: "center",
    vertical: "bottom",
  });
  assert.deepEqual(projectLayoutContentAlign("vertical", { horizontal: "right", vertical: "center" }), {
    horizontal: "right",
    vertical: "center",
  });
  assert.deepEqual(projectLayoutContentAlign("vertical", undefined), {
    horizontal: "left",
    vertical: "top",
  });
});
