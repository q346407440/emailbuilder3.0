import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveRowInlineImageBox } from "./rowInlineImageBox";

test("deriveRowInlineImageBox 读 AST aspect 3:4", () => {
  assert.deepEqual(deriveRowInlineImageBox(200, { w: 3, h: 4 }), { widthPx: 150, heightPx: 200 });
  assert.deepEqual(deriveRowInlineImageBox(140, { w: 3, h: 4 }), { widthPx: 105, heightPx: 140 });
  assert.deepEqual(deriveRowInlineImageBox(320, { w: 3, h: 4 }), { widthPx: 240, heightPx: 320 });
});

test("deriveRowInlineImageBox 漏写 aspect 兜底 3:4", () => {
  assert.deepEqual(deriveRowInlineImageBox(200), { widthPx: 150, heightPx: 200 });
});

test("deriveRowInlineImageBox 方图 1:1", () => {
  assert.deepEqual(deriveRowInlineImageBox(100, { w: 1, h: 1 }), { widthPx: 100, heightPx: 100 });
});

test("deriveRowInlineImageBox clamp 下限", () => {
  assert.deepEqual(deriveRowInlineImageBox(72, { w: 1, h: 1 }), { widthPx: 72, heightPx: 72 });
  assert.deepEqual(deriveRowInlineImageBox(72, { w: 3, h: 4 }), { widthPx: 72, heightPx: 72 });
});

test("deriveRowInlineImageBox 非法 aspect 回退 3:4", () => {
  assert.deepEqual(deriveRowInlineImageBox(200, { w: 0, h: 4 }), { widthPx: 150, heightPx: 200 });
});
