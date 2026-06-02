import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BindingCollectionField } from "../types/email";
import {
  parentScalarItemFieldsFromItemFields,
  sanitizeListRepeatUserLabel,
} from "./repeatNestedBindingUi";

describe("sanitizeListRepeatUserLabel", () => {
  it("去掉遗留的 repeat 英文标记并归一空白", () => {
    assert.equal(sanitizeListRepeatUserLabel("商品行（repeat）"), "商品行");
    assert.equal(sanitizeListRepeatUserLabel("SKU  repeat  条"), "SKU 条");
  });
});

describe("parentScalarItemFieldsFromItemFields", () => {
  it("仅保留标量列，过滤子列表列", () => {
    const itemFields: BindingCollectionField[] = [
      { key: "title", label: "标题", valueType: "string" },
      {
        key: "skus",
        label: "规格列表",
        valueType: "collection",
        itemFields: [{ key: "name", label: "规格名", valueType: "string" }],
      },
      { key: "price", label: "价格", valueType: "string" },
    ];
    const scalars = parentScalarItemFieldsFromItemFields(itemFields);
    assert.deepEqual(scalars.map((f) => f.key), ["title", "price"]);
  });
});
