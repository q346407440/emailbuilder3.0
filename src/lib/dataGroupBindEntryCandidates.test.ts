import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDataGroupBindEntryCandidates } from "./dataGroupBindEntryCandidates";

describe("buildDataGroupBindEntryCandidates", () => {
  it("嵌套上下文下列表候选含父项子列表且排除父级顶层槽", () => {
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {},
      values: {
        similarSpuList: [
          {
            name: "商品 A",
            similarSpus: [{ name: "相似 1" }, { name: "相似 2" }],
          },
        ],
      },
    };
    const repeatCandidates = [
      {
        key: "similarSpuList::similarSpus",
        slotId: "similarSpuList",
        itemPath: "similarSpus",
        label: "相似商品列表",
        parentSlotLabel: "相似品列表",
        description: "「相似品列表」父项的子列表",
        itemFields: [{ key: "name", label: "商品名", valueType: "string" as const, required: true }],
        minItems: 0,
        maxItems: 5,
      },
    ];
    const objectCandidates = [
      {
        key: "loyaltyRecommendedSubscriptionPlans",
        slotId: "loyaltyRecommendedSubscriptionPlans",
        label: "推荐订阅套餐",
        objectFields: [{ key: "title", label: "标题", valueType: "string" as const, required: true }],
      },
    ];

    const rows = buildDataGroupBindEntryCandidates(repeatCandidates, objectCandidates, payload);
    assert.equal(rows.length, 2);
    const nested = rows.find((r) => r.key === "similarSpuList::similarSpus");
    assert.ok(nested);
    assert.equal(nested!.valueType, "collection");
    assert.equal(nested!.itemPath, "similarSpus");
    assert.equal(nested!.parentSlotLabel, "相似品列表");
    assert.match(nested!.summary, /2 项/);
    assert.ok(!rows.some((r) => r.key === "similarSpuList" && !r.itemPath));
  });
});
