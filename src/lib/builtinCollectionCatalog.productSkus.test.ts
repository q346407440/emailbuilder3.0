import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  projectBuiltinCatalogItemsFromRows,
  projectBuiltinCatalogProductSkus,
} from "./builtinCollectionCatalog";
import { formatBuiltinSkuSelectionKey } from "../payload-contract/collection-builtin-catalog-config";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "./builtinProductsMockData";

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

describe("projectBuiltinCatalogItemsFromRows · SKU 扁平行", () => {
  it("spu::sku 复合 id 不被 catalog SPU 排序过滤掉", () => {
    const product = BUILTIN_PRODUCTS_MOCK_RAW[0]!;
    const sku = product.skus[0]!;
    const flatRow = {
      id: formatBuiltinSkuSelectionKey(product.id, sku.id),
      title: sku.title,
      href: sku.href,
      imageSrc: sku.imageSrc,
      imageAlt: sku.imageAlt,
      salePrice: sku.salePrice,
      originalPrice: sku.originalPrice,
    };
    const projected = projectBuiltinCatalogItemsFromRows(
      [flatRow],
      [
        { key: "title", label: "规格名", valueType: "string", required: true },
        { key: "salePrice", label: "售价", valueType: "string", required: true },
      ],
      5,
      "catalogOrder",
      "products"
    );
    assert.equal(projected.length, 1);
    assert.equal(projected[0]?.title, "曜石黑");
    assert.equal(projected[0]?.salePrice, "$79.00");
  });
});
