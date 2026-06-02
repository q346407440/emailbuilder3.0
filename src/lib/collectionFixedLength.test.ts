import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload } from "../types/email";
import {
  applyPayloadCollectionFixedLength,
  collectionFixedLengthEditability,
  readPayloadCollectionFixedLength,
} from "./collectionFixedLength";

function basePayload(): EmailPayload {
  return {
    slots: {
      products: {
        label: "商品列表",
        valueType: "collection",
        minItems: 2,
        maxItems: 2,
        itemFields: [
          { key: "name", label: "名称", valueType: "string", required: true },
        ],
        dataSource: { type: "custom" },
      },
      derived: {
        label: "相似品",
        valueType: "collection",
        minItems: 2,
        maxItems: 2,
        itemFields: [{ key: "name", label: "名称", valueType: "string", required: true }],
        dataSource: {
          type: "remote",
          provider: "builtin",
          catalog: "products",
          sort: { strategy: "similarTo", targetSlotId: "products" },
        },
      },
    },
    values: {
      products: [{ name: "A" }, { name: "B" }],
      derived: [{ name: "x" }, { name: "y" }],
    },
  };
}

describe("collectionFixedLength", () => {
  it("collectionFixedLengthEditability：派生列表不可编辑", () => {
    const payload = basePayload();
    const r = collectionFixedLengthEditability(payload, "derived");
    assert.equal(r.editable, false);
    assert.match(r.reason ?? "", /目标变量/);
  });

  it("collectionFixedLengthEditability：嵌套 repeat 不可编辑", () => {
    const payload = basePayload();
    const r = collectionFixedLengthEditability(payload, "products", {
      nestedRepeatItemPath: true,
    });
    assert.equal(r.editable, false);
  });

  it("applyPayloadCollectionFixedLength 同步 min/max 并 pad values", () => {
    const payload = basePayload();
    const next = applyPayloadCollectionFixedLength(payload, "products", 4);
    assert.equal(next.slots.products?.minItems, 4);
    assert.equal(next.slots.products?.maxItems, 4);
    const rows = next.values.products as Array<Record<string, unknown>>;
    assert.equal(rows.length, 4);
    assert.equal(readPayloadCollectionFixedLength(next, "products"), 4);
  });
});
