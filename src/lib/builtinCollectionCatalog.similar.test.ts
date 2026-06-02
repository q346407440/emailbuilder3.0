import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectBuiltinCatalogSimilarTo } from "./builtinCollectionCatalog";

describe("projectBuiltinCatalogSimilarTo", () => {
  const itemFields = [
    { key: "name", label: "名", valueType: "string" as const, required: true },
    { key: "href", label: "链", valueType: "url" as const, required: true },
  ];

  it("相似品按 SPU href 排除，不按 SKU 字段", () => {
    const anchor = {
      name: "Aura 无线耳机",
      href: "https://example.com/products/aura-earbuds",
      skuTitle1: "仅锚点行内的 SKU 展示字段",
    };
    const rows = projectBuiltinCatalogSimilarTo(
      "products",
      itemFields,
      9,
      "catalogOrder",
      anchor,
      "href"
    );
    assert.equal(rows.length, 9);
    assert.ok(
      rows.every((r) => r.href !== anchor.href),
      "目录中应排除整款 SPU，而非按 skuTitle 匹配"
    );
  });

  it("排除锚点商品后相似品 mock 置顶", () => {
    const anchor = {
      name: "Aura 无线耳机",
      href: "https://example.com/products/aura-earbuds",
    };
    const rows = projectBuiltinCatalogSimilarTo(
      "products",
      itemFields,
      3,
      "priceDesc",
      anchor,
      "href"
    );
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.href !== anchor.href));
    assert.equal(rows[0]?.name, "相似品");
  });
});
