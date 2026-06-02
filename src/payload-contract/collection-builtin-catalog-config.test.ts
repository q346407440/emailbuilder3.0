import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSpuOnlyBuiltinProductSelection,
  normalizeBuiltinProductListConfig,
} from "./collection-builtin-catalog-config";
import { builtinProductPickerTabsForConfig } from "../lib/builtinPickerCatalog";

describe("productSelectionScope spuOnly", () => {
  it("归一化时清除 skuSelection", () => {
    const c = normalizeBuiltinProductListConfig({
      rangeMode: "freeSelect",
      productSelectionScope: "spuOnly",
      selectedSpuIds: ["a"],
      skuSelection: ["gid://shopify/Product/x::gid://shopify/ProductVariant/y"],
    });
    assert.equal(c.productSelectionScope, "spuOnly");
    assert.deepEqual(c.skuSelection, []);
    assert.ok(isSpuOnlyBuiltinProductSelection(c));
  });

  it("选择器 Tab 不含按 SKU", () => {
    const tabs = builtinProductPickerTabsForConfig(
      normalizeBuiltinProductListConfig({ productSelectionScope: "spuOnly", rangeMode: "allProducts" })
    );
    assert.ok(!tabs.some((t) => t.id === "sku"));
  });
});
