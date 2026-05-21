import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gridRowHeightsStable, stabilizeGridRowHeights } from "./gridContentMaxHeight";

describe("gridContentMaxHeight", () => {
  it("stabilizeGridRowHeights 在 1px 内保持上一轮值", () => {
    assert.deepEqual(stabilizeGridRowHeights([101, 200], [100, 199]), [100, 199]);
    assert.deepEqual(stabilizeGridRowHeights([103, 200], [100, 199]), [103, 199]);
  });

  it("gridRowHeightsStable 判断行高数组是否稳定", () => {
    assert.equal(gridRowHeightsStable([100, 200], [100, 200]), true);
    assert.equal(gridRowHeightsStable([101, 200], [100, 200]), true);
    assert.equal(gridRowHeightsStable([102, 200], [100, 200]), false);
  });
});
