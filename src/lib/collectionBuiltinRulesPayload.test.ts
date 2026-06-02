import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload } from "../types/email";
import { patchPayloadBuiltinCollectionSortPolicy } from "./collectionBuiltinRulesPayload";

function payloadWithPickedProducts(): EmailPayload {
  return {
    schemaVersion: "1.0.0",
    slots: {
      pickedSpotlightProduct: {
        label: "主推",
        valueType: "collection",
        itemFields: [{ key: "href", label: "链接", valueType: "url", required: true }],
        minItems: 1,
        maxItems: 1,
        dataSource: { type: "remote", provider: "builtin", catalog: "products" },
      },
      pickedProducts: {
        label: "精选",
        valueType: "collection",
        itemFields: [{ key: "href", label: "链接", valueType: "url", required: true }],
        minItems: 4,
        maxItems: 4,
        dataSource: {
          type: "remote",
          provider: "builtin",
          catalog: "products",
          sort: "catalogOrder",
        },
      },
    },
    values: {
      pickedSpotlightProduct: [{ href: "https://example.com/a" }],
      pickedProducts: [],
    },
  };
}

describe("collectionBuiltinRulesPayload", () => {
  it("patchPayloadBuiltinCollectionSortPolicy 写入常规 sort", () => {
    const base = payloadWithPickedProducts();
    const next = patchPayloadBuiltinCollectionSortPolicy(base, "pickedProducts", {
      kind: "regular",
      sort: "priceDesc",
    });
    assert.equal(next.slots.pickedProducts?.dataSource?.type, "remote");
    if (next.slots.pickedProducts?.dataSource?.type === "remote") {
      assert.equal(next.slots.pickedProducts.dataSource.sort, "priceDesc");
    }
    assert.ok(Array.isArray(next.values.pickedProducts));
    assert.equal((next.values.pickedProducts as unknown[]).length, 4);
  });

});
