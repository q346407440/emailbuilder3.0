import assert from "node:assert";
import { describe, it } from "node:test";
import {
  MERCHANT_SPU_TREE_CHILD_COUNTS,
  MERCHANT_SPU_TREE_PARENT_COUNT,
  buildMerchantComplementSpuTreeSeedValues,
  buildMerchantSimilarSpuTreeSeedValues,
} from "./loyaltyMerchantSpuTreePresetSeed";

describe("loyaltyMerchantSpuTreePresetSeed", () => {
  it("生成 10 条父行且子列表条数按 54321 两轮", () => {
    for (const build of [
      buildMerchantSimilarSpuTreeSeedValues,
      buildMerchantComplementSpuTreeSeedValues,
    ]) {
      const rows = build();
      assert.equal(rows.length, MERCHANT_SPU_TREE_PARENT_COUNT);
      const childKey = build === buildMerchantSimilarSpuTreeSeedValues ? "similarSpus" : "complementSpus";
      for (let i = 0; i < rows.length; i++) {
        const children = rows[i]![childKey] as unknown[];
        assert.equal(children.length, MERCHANT_SPU_TREE_CHILD_COUNTS[i]);
        for (const child of children) {
          assert.equal(typeof (child as Record<string, unknown>).name, "string");
          assert.equal(typeof (child as Record<string, unknown>).href, "string");
        }
      }
    }
  });
});
