import assert from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG } from "../payload-contract/collection-builtin-catalog-config";
import { MERCHANT_SIMILAR_SPU_TREE_ITEM_FIELDS } from "./loyaltyMerchantSpuTreePresetSeed";
import { resolveBuiltinProductListItems } from "./builtinProductListResolve";

describe("相似品/搭配品 builtin 商品列表解析", () => {
  it("全部商品时解析 10 条主 SPU 并挂 similarSpus", () => {
    const rows = resolveBuiltinProductListItems({
      config: { ...DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG, rangeMode: "allProducts" },
      itemFields: MERCHANT_SIMILAR_SPU_TREE_ITEM_FIELDS,
      limit: 10,
      payload: { schemaVersion: "1.0.0", slots: {}, values: {} },
    });
    assert.equal(rows.length, 10);
    assert.equal((rows[0]?.similarSpus as unknown[]).length, 5);
    assert.equal((rows[4]?.similarSpus as unknown[]).length, 1);
    assert.equal((rows[5]?.similarSpus as unknown[]).length, 5);
  });
});
