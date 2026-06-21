import assert from "node:assert/strict";
import { test } from "node:test";
import { mapImageOverlayAlign } from "./resolveValue";

test("mapImageOverlayAlign 双轴缺省 → 双轴居中", () => {
  assert.deepEqual(mapImageOverlayAlign(undefined, undefined), {
    horizontal: "center",
    vertical: "center",
  });
});

test("mapImageOverlayAlign start + center → 左中（横幅 CTA）", () => {
  assert.deepEqual(mapImageOverlayAlign("start", "center"), {
    horizontal: "left",
    vertical: "center",
  });
});

test("mapImageOverlayAlign start + start → 左上（角标）", () => {
  assert.deepEqual(mapImageOverlayAlign("start", "start"), {
    horizontal: "left",
    vertical: "top",
  });
});

test("mapImageOverlayAlign center 单轴 → 双轴居中", () => {
  assert.deepEqual(mapImageOverlayAlign("center", undefined), {
    horizontal: "center",
    vertical: "center",
  });
});

test("mapImageOverlayAlign end + end → 右下", () => {
  assert.deepEqual(mapImageOverlayAlign("end", "end"), {
    horizontal: "right",
    vertical: "bottom",
  });
});
