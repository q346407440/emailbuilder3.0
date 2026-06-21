import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveButtonStyleWidthMode } from "./resolveValue";

test("resolveButtonStyleWidthMode 缺省 → hug", () => {
  assert.equal(resolveButtonStyleWidthMode(undefined), "hug");
});

test("resolveButtonStyleWidthMode hug → hug", () => {
  assert.equal(resolveButtonStyleWidthMode("hug"), "hug");
});

test("resolveButtonStyleWidthMode fill → fill", () => {
  assert.equal(resolveButtonStyleWidthMode("fill"), "fill");
});
