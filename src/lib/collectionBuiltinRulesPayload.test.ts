import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload } from "../types/email";
import {
  patchPayloadBuiltinCollectionExtract,
  patchPayloadBuiltinCollectionSort,
} from "./collectionBuiltinRulesPayload";

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
  it("patchPayloadBuiltinCollectionSort 写入 slots.dataSource.sort", () => {
    const base = payloadWithPickedProducts();
    const next = patchPayloadBuiltinCollectionSort(base, "pickedProducts", "salesDesc");
    assert.equal(next.slots.pickedProducts?.dataSource?.type, "remote");
    if (next.slots.pickedProducts?.dataSource?.type === "remote") {
      assert.equal(next.slots.pickedProducts.dataSource.sort, "salesDesc");
    }
    assert.ok(Array.isArray(next.values.pickedProducts));
    assert.equal((next.values.pickedProducts as unknown[]).length, 4);
  });

  it("patchPayloadBuiltinCollectionExtract 写入 similarTo 并刷新 values", () => {
    const base = payloadWithPickedProducts();
    const next = patchPayloadBuiltinCollectionExtract(base, "pickedProducts", {
      kind: "similarTo",
      fromSlotId: "pickedSpotlightProduct",
      matchField: "href",
    });
    const ds = next.slots.pickedProducts?.dataSource;
    assert.equal(ds?.type, "remote");
    if (ds?.type === "remote" && ds.provider === "builtin") {
      assert.equal(ds.extract?.kind, "similarTo");
      if (ds.extract?.kind === "similarTo") {
        assert.equal(ds.extract.fromSlotId, "pickedSpotlightProduct");
      }
    }
    assert.equal((next.values.pickedProducts as unknown[]).length, 4);
  });
});
