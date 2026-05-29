import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCollectionDisplayRule, normalizeCollectionDisplayRule } from "./collectionDisplayRule";

describe("collectionDisplayRule", () => {
  it("normalizeCollectionDisplayRule 清理空值与重复值", () => {
    const normalized = normalizeCollectionDisplayRule({
      keyField: " type ",
      includeValues: ["A", "A", " ", "B"],
      excludeValues: ["legacy", "", "legacy"],
    });
    assert.deepEqual(normalized, {
      keyField: "type",
      includeValues: ["A", "B"],
      excludeValues: ["legacy"],
    });
  });

  it("applyCollectionDisplayRule 按 include/exclude 过滤", () => {
    const items = [
      { type: "A", title: "一" },
      { type: "B", title: "二" },
      { type: "C", title: "三" },
      { type: "A", title: "四" },
    ];
    const filtered = applyCollectionDisplayRule(items, {
      keyField: "type",
      includeValues: ["A", "C"],
      excludeValues: ["C"],
    });
    assert.deepEqual(filtered, [
      { type: "A", title: "一" },
      { type: "A", title: "四" },
    ]);
  });
});
