import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveRowGapMode } from "./resolveValue";

test("resolveRowGapMode between → auto", () => {
  assert.equal(resolveRowGapMode("between"), "auto");
});

test("resolveRowGapMode start/center/end → fixed", () => {
  assert.equal(resolveRowGapMode("start"), "fixed");
  assert.equal(resolveRowGapMode("center"), "fixed");
  assert.equal(resolveRowGapMode("end"), "fixed");
  assert.equal(resolveRowGapMode(undefined), "fixed");
});
