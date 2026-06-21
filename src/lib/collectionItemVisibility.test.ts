import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCollectionItemVisibility,
  collectionSlotAllowsItemVisibility,
  normalizeItemVisibility,
  setCollectionItemVisibilityAt,
} from "./collectionItemVisibility";
import type { PayloadSlotDefinition } from "../types/email";

describe("collectionItemVisibility", () => {
  const loyaltyInternalSlot: PayloadSlotDefinition = {
    label: "数据展示",
    valueType: "collection",
    scene: "loyalty-internal-admin",
  };

  it("collectionSlotAllowsItemVisibility 仅 loyalty 内部列表为 true", () => {
    assert.equal(collectionSlotAllowsItemVisibility(loyaltyInternalSlot), true);
    assert.equal(
      collectionSlotAllowsItemVisibility({
        label: "商品列表",
        valueType: "collection",
        scene: "loyalty-merchant-admin",
      }),
      false
    );
    assert.equal(
      collectionSlotAllowsItemVisibility({ label: "自定义", valueType: "collection" }),
      false
    );
  });

  it("normalizeItemVisibility 缺省为全部展示", () => {
    assert.deepEqual(normalizeItemVisibility(3, undefined), [true, true, true]);
    assert.deepEqual(normalizeItemVisibility(2, [false]), [false, true]);
  });

  it("applyCollectionItemVisibility 过滤 false 下标", () => {
    const items = [{ a: "1" }, { a: "2" }, { a: "3" }];
    assert.deepEqual(applyCollectionItemVisibility(items, [true, false, true], loyaltyInternalSlot), [
      { a: "1" },
      { a: "3" },
    ]);
  });

  it("applyCollectionItemVisibility 非 loyalty 内部列表忽略 itemVisibility", () => {
    const items = [{ a: "1" }, { a: "2" }, { a: "3" }];
    assert.deepEqual(
      applyCollectionItemVisibility(items, [true, false, true], {
        label: "商品列表",
        valueType: "collection",
        scene: "loyalty-merchant-admin",
      }),
      items
    );
    assert.deepEqual(applyCollectionItemVisibility(items, [true, false, true]), items);
  });

  it("setCollectionItemVisibilityAt 更新单下标", () => {
    assert.deepEqual(setCollectionItemVisibilityAt([true, true], 2, 1, false), [true, false]);
  });
});
