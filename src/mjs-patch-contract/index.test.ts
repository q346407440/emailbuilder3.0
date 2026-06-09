import { test } from "node:test";
import assert from "node:assert/strict";
import { MJS_PATCH_SLOT_IDS, isMjsPatchSlotId, wrapMjsSlot } from "./index";

test("MJS_PATCH_SLOT_IDS 包含 COLORS 与 buildS1", () => {
  assert.ok(MJS_PATCH_SLOT_IDS.includes("COLORS"));
  assert.ok(MJS_PATCH_SLOT_IDS.includes("buildS1"));
  assert.ok(isMjsPatchSlotId("template"));
  assert.ok(!isMjsPatchSlotId("buildS9"));
});

test("wrapMjsSlot 生成可解析锚点", () => {
  const wrapped = wrapMjsSlot("COLORS", "const COLORS = {};");
  assert.match(wrapped, /\/\* @mjs-slot:COLORS \*\//);
  assert.match(wrapped, /\/\* @mjs-slot-end:COLORS \*\//);
});
