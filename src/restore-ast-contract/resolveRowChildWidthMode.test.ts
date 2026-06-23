import assert from "node:assert/strict";
import test from "node:test";
import { resolveDirectRowChildWrapperWidthMode } from "./resolveRowChildWidthMode";

test("resolveDirectRowChildWrapperWidthMode：between 横排直子 → hug", () => {
  assert.equal(
    resolveDirectRowChildWrapperWidthMode({ inDirectRow: true, rowAlign: "between" }),
    "hug"
  );
});

test("resolveDirectRowChildWrapperWidthMode：start 横排直子 → fill", () => {
  assert.equal(
    resolveDirectRowChildWrapperWidthMode({ inDirectRow: true, rowAlign: "start" }),
    "fill"
  );
});

test("resolveDirectRowChildWrapperWidthMode：forceFill 覆盖 between", () => {
  assert.equal(
    resolveDirectRowChildWrapperWidthMode(
      { inDirectRow: true, rowAlign: "between" },
      { forceFill: true }
    ),
    "fill"
  );
});
