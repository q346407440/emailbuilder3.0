import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveButtonWrapperContentAlign, resolveTextContentAlign } from "./textContentAlign";

test("row align start → 直接子 text 左对齐", () => {
  assert.deepEqual(
    resolveTextContentAlign({ inDirectRow: true, rowAlign: "start" }),
    { horizontal: "left", vertical: "top" }
  );
});

test("非 stack/row 子 text 保持默认居中", () => {
  assert.deepEqual(resolveTextContentAlign({}), {
    horizontal: "center",
    vertical: "top",
  });
});

test("stack align start → text 左对齐", () => {
  assert.deepEqual(
    resolveTextContentAlign({ inDirectStack: true, stackAlign: "start" }),
    { horizontal: "left", vertical: "top" }
  );
});

test("stack align end → text 右对齐", () => {
  assert.deepEqual(
    resolveTextContentAlign({ inDirectStack: true, stackAlign: "end" }),
    { horizontal: "right", vertical: "top" }
  );
});

test("stack 未写 align → text 居中", () => {
  assert.deepEqual(resolveTextContentAlign({ inDirectStack: true }), {
    horizontal: "center",
    vertical: "top",
  });
});

test("text 自身 align start 覆盖父 stack center", () => {
  assert.deepEqual(
    resolveTextContentAlign({ inDirectStack: true, stackAlign: "center" }, "start"),
    { horizontal: "left", vertical: "top" }
  );
});

test("text 自身 align center 覆盖父 stack start", () => {
  assert.deepEqual(
    resolveTextContentAlign({ inDirectStack: true, stackAlign: "start" }, "center"),
    { horizontal: "center", vertical: "top" }
  );
});

test("image 叠放子 text 缺省 align → 双轴居中", () => {
  assert.deepEqual(resolveTextContentAlign({ inDirectImageOverlay: true }), {
    horizontal: "center",
    vertical: "center",
  });
});

test("image 叠放 align start + crossAlign center → text 左中", () => {
  assert.deepEqual(
    resolveTextContentAlign({
      inDirectImageOverlay: true,
      imageOverlayAlign: "start",
      imageOverlayCrossAlign: "center",
    }),
    { horizontal: "left", vertical: "center" }
  );
});

test("image 叠放 align start → text 左上（双轴显式 start）", () => {
  assert.deepEqual(
    resolveTextContentAlign({
      inDirectImageOverlay: true,
      imageOverlayAlign: "start",
      imageOverlayCrossAlign: "start",
    }),
    { horizontal: "left", vertical: "top" }
  );
});

test("image 叠放 align start + crossAlign center → button wrapper 左对齐", () => {
  assert.deepEqual(
    resolveButtonWrapperContentAlign({
      inDirectImageOverlay: true,
      imageOverlayAlign: "start",
      imageOverlayCrossAlign: "center",
    }),
    { horizontal: "left", vertical: "center" }
  );
});

test("stack align start → button wrapper 左对齐", () => {
  assert.deepEqual(
    resolveButtonWrapperContentAlign({ inDirectStack: true, stackAlign: "start" }),
    { horizontal: "left", vertical: "center" }
  );
});

test("stack align center → button wrapper 居中", () => {
  assert.deepEqual(resolveButtonWrapperContentAlign({ inDirectStack: true, stackAlign: "center" }), {
    horizontal: "center",
    vertical: "center",
  });
});

test("非 stack 子 button → wrapper 默认居中", () => {
  assert.deepEqual(resolveButtonWrapperContentAlign({}), {
    horizontal: "center",
    vertical: "center",
  });
});
