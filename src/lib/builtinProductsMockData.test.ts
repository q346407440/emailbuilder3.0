import assert from "node:assert/strict";
import https from "node:https";
import { describe, it } from "node:test";
import {
  flattenBuiltinProductRow,
  projectBuiltinCatalogItems,
} from "./builtinCollectionCatalog";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "./builtinProductsMockData";

const EXPECTED_SKU_COUNTS = [5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 1, 1];

function httpGetStatus(url: string): Promise<number> {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(15_000, () => {
      req.destroy();
      resolve(0);
    });
  });
}

describe("BUILTIN_PRODUCTS_MOCK_RAW", () => {
  it("12 条 SPU（含相似品/搭配品演示），SKU 数量为 5-4-3-2-1 两轮 + 2", () => {
    assert.equal(BUILTIN_PRODUCTS_MOCK_RAW.length, 12);
    const counts = BUILTIN_PRODUCTS_MOCK_RAW.map((p) => p.skus.length);
    assert.deepEqual(counts, EXPECTED_SKU_COUNTS);
  });

  it("每条 SKU 具备价格/库存/销量且 SPU 仅保留展示级 badge", () => {
    for (const product of BUILTIN_PRODUCTS_MOCK_RAW) {
      assert.ok(product.id.startsWith("gid://shopify/Product/"));
      assert.ok(product.href.includes(product.handle));
      for (const variant of product.skus) {
        assert.ok(variant.id.includes("ProductVariant"));
        assert.ok(variant.sku.length > 0);
        assert.ok(variant.imageSrc.startsWith("https://images.pexels.com/"));
        assert.ok(parsePriceLike(variant.salePrice) > 0);
        assert.ok(variant.inventoryQuantity >= 0);
        assert.ok(variant.totalSales >= 0);
      }
    }
  });

  it("扁平化行保留 skus 且主推字段来自销量最高 SKU", () => {
    const flat = flattenBuiltinProductRow(BUILTIN_PRODUCTS_MOCK_RAW[0]!);
    assert.equal(flat.skuCount, 5);
    assert.ok(Array.isArray(flat.skus) && flat.skus.length === 5);
    assert.equal(flat.name, "Aura 无线耳机");
    assert.equal(flat.imageSrc, BUILTIN_PRODUCTS_MOCK_RAW[0]!.skus[0]!.imageSrc);
    assert.equal(flat.salePrice, "$79.00");
    assert.ok(!("skuImage1" in flat));
    assert.ok(Array.isArray(flat.skus));
  });

  it("projectBuiltinCatalogItems 可将 5 个 SKU 投影到 skuImage1..5", () => {
    const fields = [
      { key: "name", label: "名", valueType: "string" as const, required: true },
      { key: "skuImage1", label: "图1", valueType: "image" as const, required: true },
      { key: "skuTitle5", label: "规5", valueType: "string" as const, required: true },
    ];
    const rows = projectBuiltinCatalogItems("products", fields, 1, "catalogOrder");
    assert.equal(rows[0]?.name, "Aura 无线耳机");
    assert.ok(String(rows[0]?.skuImage1).includes("pexels"));
    assert.equal(rows[0]?.skuTitle5, "礼盒装 · 白");
  });

  it("所有 SKU 图片 URL 可 GET 200", async () => {
    const urls = new Set<string>();
    for (const product of BUILTIN_PRODUCTS_MOCK_RAW) {
      for (const variant of product.skus) {
        urls.add(variant.imageSrc);
      }
    }
    assert.equal(urls.size, 32);
    for (const url of urls) {
      const status = await httpGetStatus(url);
      assert.equal(status, 200, `图片不可访问: ${url} (status ${status})`);
    }
  });
});

function parsePriceLike(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
