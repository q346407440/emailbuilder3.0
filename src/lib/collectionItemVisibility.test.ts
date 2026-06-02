import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCollectionItemVisibility,
  normalizeItemVisibility,
  setCollectionItemVisibilityAt,
} from "./collectionItemVisibility";

describe("collectionItemVisibility", () => {
  it("normalizeItemVisibility 缺省为全部展示", () => {
    assert.deepEqual(normalizeItemVisibility(3, undefined), [true, true, true]);
    assert.deepEqual(normalizeItemVisibility(2, [false]), [false, true]);
  });

  it("applyCollectionItemVisibility 过滤 false 下标", () => {
    const items = [{ a: "1" }, { a: "2" }, { a: "3" }];
    assert.deepEqual(applyCollectionItemVisibility(items, [true, false, true]), [
      { a: "1" },
      { a: "3" },
    ]);
  });

  it("setCollectionItemVisibilityAt 更新单下标", () => {
    assert.deepEqual(setCollectionItemVisibilityAt([true, true], 2, 1, false), [true, false]);
  });
});
