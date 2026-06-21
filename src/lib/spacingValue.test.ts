import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSpacingValueForStorage } from "./spacingValue";

describe("normalizeSpacingValueForStorage", () => {
  it("已是四边平铺时保留各边", () => {
    assert.deepEqual(
      normalizeSpacingValueForStorage({ top: "8px", right: "0", bottom: "0", left: "0" }),
      {
        top: "8px",
        right: "0",
        bottom: "0",
        left: "0",
      }
    );
  });

  it("缺边对象写入时补齐为四边平铺", () => {
    assert.deepEqual(normalizeSpacingValueForStorage({ top: "8px" }), {
      top: "8px",
      right: "0",
      bottom: "0",
      left: "0",
    });
  });

  it("legacy unified 回落 spacingZero", () => {
    assert.deepEqual(normalizeSpacingValueForStorage({ mode: "unified", unified: "8px" }), {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    });
  });

  it("缺 mode 仅有 unified 键时回落 spacingZero", () => {
    assert.deepEqual(normalizeSpacingValueForStorage({ unified: "8px" }), {
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    });
  });
});
