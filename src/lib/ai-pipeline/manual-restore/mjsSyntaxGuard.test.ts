import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRuleWithSyntaxGuard, isParseableMjs } from "./mjsSyntaxGuard";

test("isParseableMjs 接受合法 mjs（含 import / 模板字符串）", () => {
  const source = `import { x } from './a.mjs';
const COLORS = { primary: '#000' };
const t = \`\${COLORS.primary}-s1\`;
export default t;`;
  assert.equal(isParseableMjs(source), true);
});

test("isParseableMjs 拒绝语法错误", () => {
  const source = `const a = { b: , };`;
  assert.equal(isParseableMjs(source), false);
});

test("applyRuleWithSyntaxGuard 回退破坏语法的改写", () => {
  const before = `const a = { b: 1 };`;
  const result = applyRuleWithSyntaxGuard(before, () => ({
    source: `const a = { b: 1, , };`,
    fixes: ["危险改写"],
  }));
  assert.equal(result.reverted, true);
  assert.equal(result.source, before);
  assert.deepEqual(result.fixes, []);
});

test("applyRuleWithSyntaxGuard 放行合法改写", () => {
  const before = `const a = { b: 1 };`;
  const result = applyRuleWithSyntaxGuard(before, () => ({
    source: `const a = { b: 1, c: 2 };`,
    fixes: ["补 c"],
  }));
  assert.equal(result.reverted, false);
  assert.equal(result.source, `const a = { b: 1, c: 2 };`);
  assert.deepEqual(result.fixes, ["补 c"]);
});

test("applyRuleWithSyntaxGuard 输入本就非法时不回退（交给后续路径）", () => {
  const before = `const a = { b: , };`;
  const result = applyRuleWithSyntaxGuard(before, () => ({
    source: `const a = { b: 1, };`,
    fixes: ["修复"],
  }));
  assert.equal(result.reverted, false);
  assert.equal(result.source, `const a = { b: 1, };`);
});
