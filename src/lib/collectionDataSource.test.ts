import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  builtinPreviewItemsForSlot,
  extractArrayFromJsonRoot,
  normalizeCollectionItems,
  parseCollectionJsonText,
} from "./collectionDataSource";
import { projectBuiltinCatalogItems } from "./builtinCollectionCatalog";

describe("collectionDataSource", () => {
  const itemFields = [
    { key: "title", label: "标题", valueType: "string" as const, required: true },
    { key: "iconSrc", label: "图标", valueType: "image" as const },
  ];

  it("解析根数组 JSON", () => {
    const r = parseCollectionJsonText(
      JSON.stringify([{ title: "A", iconSrc: "https://example.com/a.png" }]),
      itemFields,
      { fixedLength: 1 }
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.items[0]?.title, "A");
    }
  });

  it("解析失败时返回错误", () => {
    const r = parseCollectionJsonText("{not json", itemFields, {});
    assert.equal(r.ok, false);
  });

  it("从 data.items 路径取数组", () => {
    const extracted = extractArrayFromJsonRoot({ data: { items: [{ title: "X" }] } }, "data.items");
    assert.equal(extracted.ok, true);
    if (extracted.ok) {
      const norm = normalizeCollectionItems(extracted.items, itemFields, { fixedLength: 1 });
      assert.equal(norm.ok, true);
    }
  });

  it("固定长度：取前 N 条，多则截断", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ title: `T${i + 1}` }));
    const r = parseCollectionJsonText(JSON.stringify(many), itemFields, { fixedLength: 5 });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.items.length, 5);
      assert.equal(r.items[0]?.title, "T1");
      assert.equal(r.items[4]?.title, "T5");
    }
  });

  it("固定长度：不足 N 条时补空项", () => {
    const r = parseCollectionJsonText(JSON.stringify([{ title: "仅一条" }]), itemFields, {
      fixedLength: 3,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.items.length, 3);
      assert.equal(r.items[0]?.title, "仅一条");
      assert.equal(r.items[1]?.title, "");
    }
  });

  it("内置商品 catalog 可投影到权益字段（title/subtitle/iconSrc）", () => {
    const benefitFields = [
      { key: "title", label: "权益标题", valueType: "string" as const, required: true },
      { key: "subtitle", label: "权益说明", valueType: "string" as const, required: true },
      { key: "iconSrc", label: "图标", valueType: "image" as const, required: true },
    ];
    const items = builtinPreviewItemsForSlot("products", benefitFields, 2);
    assert.equal(items.length, 2);
    assert.ok(String(items[0]?.title).length > 0);
    assert.ok(String(items[0]?.subtitle).length > 0);
    assert.ok(String(items[0]?.iconSrc).startsWith("https://"));
  });

  it("内置商品 catalog 可投影到商品字段", () => {
    const fields = [
      { key: "name", label: "名", valueType: "string" as const },
      { key: "imageSrc", label: "图", valueType: "image" as const },
    ];
    const items = projectBuiltinCatalogItems("products", fields, 3);
    assert.equal(items.length, 3);
    assert.ok(String(items[0]?.name).length > 0);
    assert.ok(String(items[0]?.imageSrc).startsWith("https://"));
  });
});
