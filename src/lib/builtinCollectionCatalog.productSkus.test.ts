import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectBuiltinCatalogProductSkus } from "./builtinCollectionCatalog";

describe("projectBuiltinCatalogProductSkus", () => {
  it("按锚点 SPU 展开 5 个 SKU 行", () => {
    const anchor = {
      href: "https://example.com/products/aura-earbuds",
      name: "Aura 无线耳机",
    };
    const rows = projectBuiltinCatalogProductSkus(
      "products",
      [
        { key: "imageSrc", label: "图", valueType: "image", required: true },
        { key: "title", label: "规格", valueType: "string", required: true },
        { key: "href", label: "链接", valueType: "url", required: true },
      ],
      5,
      "catalogOrder",
      anchor,
      "href"
    );
    assert.equal(rows.length, 5);
    assert.equal(rows[0]?.title, "曜石黑");
    assert.equal(rows[4]?.title, "礼盒装 · 白");
  });
});
