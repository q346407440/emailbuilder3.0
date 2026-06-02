import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeRepeatBindSlotCandidates } from "./repeatBindSlotCandidates";
import { formatRepeatNestedItemPathListSummary } from "./repeatListItemField";

describe("mergeRepeatBindSlotCandidates", () => {
  it("嵌套绑定时排除父级已绑定的顶层 slotId", () => {
    const sub = [{ key: "products::skus", slotId: "products", itemPath: "skus" }];
    const top = [
      { key: "products", slotId: "products" },
      { key: "other", slotId: "other" },
    ];
    const merged = mergeRepeatBindSlotCandidates(
      { slotId: "products" },
      sub,
      top
    );
    assert.deepEqual(
      merged.map((c) => c.key),
      ["products::skus", "other"]
    );
  });

  it("无父级 repeat 时保留全部顶层槽", () => {
    const top = [{ key: "a", slotId: "a" }];
    assert.deepEqual(mergeRepeatBindSlotCandidates(null, [], top), top);
  });
});

describe("formatRepeatNestedItemPathListSummary", () => {
  it("从父项第 1 行的子数组取项数与首条预览", () => {
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {},
      values: {
        products: [
          {
            name: "Aura 无线耳机",
            skus: [
              { title: "曜石黑", salePrice: "$79" },
              { title: "珍珠白", salePrice: "$79" },
            ],
          },
        ],
      },
    };
    const itemFields = [
      { key: "title", label: "规格名", valueType: "string" as const, required: true },
    ];
    assert.equal(
      formatRepeatNestedItemPathListSummary(payload, "products", "skus", itemFields),
      "2 项 · 曜石黑"
    );
  });
});
