import assert from "node:assert/strict";
import { test } from "node:test";
import { mapCrossAlignToVertical, mapRowAlign } from "./resolveValue";

test("mapRowAlign start 无 crossAlign → 左 + 顶", () => {
  assert.deepEqual(mapRowAlign("start"), { horizontal: "left", vertical: "top" });
});

test("mapRowAlign start + crossAlign center → 左 + 竖中", () => {
  assert.deepEqual(mapRowAlign("start", "center"), {
    horizontal: "left",
    vertical: "center",
  });
});

test("mapRowAlign center 无 crossAlign → 双轴居中（兼容旧语义）", () => {
  assert.deepEqual(mapRowAlign("center"), { horizontal: "center", vertical: "center" });
});

test("mapRowAlign center + crossAlign start → 水平居中 + 贴顶", () => {
  assert.deepEqual(mapRowAlign("center", "start"), {
    horizontal: "center",
    vertical: "top",
  });
});

test("mapCrossAlignToVertical end → bottom", () => {
  assert.equal(mapCrossAlignToVertical("end"), "bottom");
});
