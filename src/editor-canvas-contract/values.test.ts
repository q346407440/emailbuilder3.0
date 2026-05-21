import assert from "node:assert/strict";
import test from "node:test";
import { EDITOR_CANVAS_RULE_IDS, getEditorCanvasRule } from "./index";
import {
  EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT,
  EMAIL_CANVAS_SCROLL_OVERFLOW_X,
  EMAIL_CANVAS_SCROLL_OVERFLOW_Y,
} from "./values";

test("画布选中联动：禁止自动 scrollIntoView", () => {
  assert.equal(EMAIL_CANVAS_AUTO_SCROLL_ON_BLOCK_SELECT, false);
});

test("画布滚动区：纵向可滚、横向 hidden", () => {
  assert.equal(EMAIL_CANVAS_SCROLL_OVERFLOW_Y, "auto");
  assert.equal(EMAIL_CANVAS_SCROLL_OVERFLOW_X, "hidden");
});

test("EDITOR_CANVAS_RULE_IDS 无重复", () => {
  assert.equal(new Set(EDITOR_CANVAS_RULE_IDS).size, EDITOR_CANVAS_RULE_IDS.length);
});

test("noAutoScrollOnBlockSelect 规则存在", () => {
  const rule = getEditorCanvasRule("editor.noAutoScrollOnBlockSelect");
  assert.ok(rule);
  assert.match(rule?.summary ?? "", /scrollIntoView/);
});
