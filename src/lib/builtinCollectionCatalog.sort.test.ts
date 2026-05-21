import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortBuiltinCatalogRows } from "./builtinCollectionCatalog";

describe("sortBuiltinCatalogRows", () => {
  it("salesDesc 将高价商品排在前面", () => {
    const rows = sortBuiltinCatalogRows("products", "salesDesc");
    const firstPrice = String(rows[0]?.salePrice ?? "");
    assert.ok(firstPrice.includes("899"), `期望最高价在前，实际首项 salePrice=${firstPrice}`);
  });

  it("nameAsc 按名称排序", () => {
    const rows = sortBuiltinCatalogRows("products", "nameAsc");
    const names = rows.map((r) => String(r.name ?? ""));
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "zh-CN"));
    assert.deepEqual(names, sorted);
  });
});
