import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLlmJson } from "./parseLlmJson";

test("parseLlmJson 去掉 markdown fence", () => {
  const out = parseLlmJson('```json\n{"a":1}\n```');
  assert.deepEqual(out, { a: 1 });
});

test("parseLlmJson 尾部多余字符时截取首段 JSON", () => {
  const out = parseLlmJson('{"theme":{"x":1},"tree":{"t":"email","children":[]}}');
  assert.equal(typeof out, "object");
});

test("parseLlmJson 尾部多余右括号", () => {
  const inner = '{"a":1}';
  const out = parseLlmJson(`${inner}}`);
  assert.deepEqual(out, { a: 1 });
});
