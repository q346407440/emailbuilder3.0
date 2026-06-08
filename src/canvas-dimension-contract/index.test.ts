import assert from "node:assert/strict";
import test from "node:test";
import { CANVAS_DIMENSION_RULE_IDS, getCanvasDimensionRule } from "./index";

test("CANVAS_DIMENSION_RULE_IDS 无重复", () => {
  assert.equal(new Set(CANVAS_DIMENSION_RULE_IDS).size, CANVAS_DIMENSION_RULE_IDS.length);
});

test("strict.fixedNoShrink 规则存在", () => {
  const rule = getCanvasDimensionRule("strict.fixedNoShrink");
  assert.ok(rule);
  assert.match(rule?.summary ?? "", /fixed/);
});

test("viewport.effectiveLayoutWidth 规则存在", () => {
  const rule = getCanvasDimensionRule("viewport.effectiveLayoutWidth");
  assert.ok(rule);
  assert.match(rule?.summary ?? "", /min/);
});
