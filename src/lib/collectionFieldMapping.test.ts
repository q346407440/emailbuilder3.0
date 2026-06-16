import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCollectionFieldPickerOptions,
  buildCollectionFieldPickerRows,
  buildRepeatListScalarFieldPickerRows,
  buildDefaultCollectionFieldMap,
  echoCustomJsonPaste,
  inferCollectionItemFieldsFromFirstRow,
  listCatalogSourceFieldKeysForPicker,
  normalizeCollectionItemsWithFieldMap,
  parseCollectionJsonTextWithFieldMap,
  readCatalogSourceValue,
  collectionSampleFromPayloadValues,
} from "./collectionFieldMapping";
import { parentScalarItemFieldsFromItemFields } from "./repeatNestedBindingUi";
import type { BindingCollectionField } from "../types/email";
import {
  canBindTargetPathToSourceKey,
  countNestedCollectionsInItemFields,
  flattenNestedCollectionFieldsPreview,
  hasNestedCollectionInItemFields,
  validateCollectionFieldMapDepth,
} from "./collectionFieldMappingTree";

describe("collectionFieldMapping", () => {
  it("inferCollectionItemFieldsFromFirstRow 推断 SPU+skus 含 number 子字段", () => {
    const fields = inferCollectionItemFieldsFromFirstRow({
      name: "Aura 无线耳机",
      imageSrc: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg",
      salePrice: "$79.00",
      skus: [
        {
          title: "曜石黑",
          href: "https://example.com/products/aura-earbuds?variant=1",
          inventoryQuantity: 86,
          totalSales: 1240,
        },
      ],
    });
    assert.ok(fields.some((f) => f.key === "name" && f.valueType === "string"));
    assert.ok(fields.some((f) => f.key === "imageSrc" && f.valueType === "url"));
    const skus = fields.find(
      (f): f is Extract<BindingCollectionField, { valueType: "collection" }> =>
        f.key === "skus" && f.valueType === "collection"
    );
    assert.ok(
      skus?.itemFields?.some(
        (c: BindingCollectionField) => c.key === "inventoryQuantity" && c.valueType === "number"
      )
    );
    assert.ok(
      skus?.itemFields?.some(
        (c: BindingCollectionField) => c.key === "totalSales" && c.valueType === "number"
      )
    );
  });

  it("echoCustomJsonPaste 从列表值回显 JSON", () => {
    const items = [{ title: "A", iconSrc: "https://example.com/a.png" }];
    const echoed = echoCustomJsonPaste(items);
    assert.ok(echoed.includes('"title": "A"'));
    assert.equal(echoCustomJsonPaste(items, '[{"title":"已有"}]'), '[{"title":"已有"}]');
  });

  it("buildCollectionFieldPickerOptions 与列表重复映射表头一致（名称/类型）", () => {
    const sample = {
      keys: ["imageSrc", "name"],
      firstItem: {
        imageSrc: "https://images.pexels.com/photos/1/a.jpeg",
        name: "Aura",
      },
    };
    const itemFields = [
      { key: "imageSrc", label: "商品图", valueType: "image" as const },
      { key: "name", label: "商品名", valueType: "string" as const },
    ];
    const options = buildCollectionFieldPickerOptions(sample, itemFields);
    const image = options.find((o) => o.key === "imageSrc");
    assert.equal(image?.label, "商品图");
    assert.equal(image?.typeLabel, "链接");
    assert.ok(image?.example.includes("pexels"));
  });

  it("listCatalogSourceFieldKeysForPicker 只暴露一套 skus.xxx 结构字段", () => {
    const firstItem = {
      name: "Aura",
      skus: [{ imageSrc: "https://example.com/1.jpg", salePrice: "$9", title: "黑" }],
      skuImage2: "legacy",
    };
    const keys = listCatalogSourceFieldKeysForPicker(firstItem);
    assert.ok(keys.includes("skus.imageSrc"));
    assert.ok(keys.includes("skus.salePrice"));
    assert.ok(!keys.includes("skuImage2"));
    assert.ok(!keys.includes("skus"));
  });

  it("collectionSampleFromPayloadValues 含子列表 skus.xxx", () => {
    const itemFields = [
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
      },
    ];
    const sample = collectionSampleFromPayloadValues(
      {
        schemaVersion: "1.0.0",
        slots: {},
        values: {
          picked: [{ name: "Aura", skus: [{ title: "黑" }] }],
        },
      },
      "picked",
      itemFields
    );
    assert.ok(sample);
    const rows = buildCollectionFieldPickerRows(sample!, itemFields);
    assert.ok(rows.some((r) => r.kind === "group" && r.groupKey === "skus"));
    assert.ok(rows.some((r) => r.key === "skus.title"));
  });

  it("flattenNestedCollectionFieldsPreview 仅含子列表分组与子字段", () => {
    const itemFields = [
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "imageSrc", label: "规格图", valueType: "image" as const }],
      },
    ];
    assert.equal(hasNestedCollectionInItemFields(itemFields), true);
    assert.equal(countNestedCollectionsInItemFields(itemFields), 1);
    const expanded = new Set(["skus"]);
    const entries = flattenNestedCollectionFieldsPreview(itemFields, expanded);
    assert.equal(entries.some((e) => e.kind === "group" && e.path === "skus"), true);
    assert.equal(entries.some((e) => e.kind === "leaf" && e.path === "skus.imageSrc"), true);
    assert.equal(entries.some((e) => e.path === "name"), false);
    const skusGroup = entries.find((e) => e.kind === "group" && e.path === "skus");
    const skuLeaf = entries.find((e) => e.kind === "leaf" && e.path === "skus.imageSrc");
    assert.equal(skusGroup?.depth, 1);
    assert.equal(skuLeaf?.depth, 2);
  });

  it("无样本时仍按 itemFields 展示子 collection 树", () => {
    const itemFields = [
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "imageSrc", label: "规格图", valueType: "image" as const }],
      },
    ];
    const rows = buildCollectionFieldPickerRows(null, itemFields);
    const groupIdx = rows.findIndex((r) => r.kind === "group" && r.groupKey === "skus");
    const childIdx = rows.findIndex((r) => r.key === "skus.imageSrc");
    assert.ok(groupIdx >= 0);
    assert.ok(childIdx > groupIdx);
    assert.equal(rows[childIdx]?.depth, 1);
    assert.equal(rows[childIdx]?.groupKey, "skus");
  });

  it("buildRepeatListScalarFieldPickerRows 不含子列表分组与 skus.xxx", () => {
    const itemFields = [
      { key: "imageSrc", label: "商品图", valueType: "url" as const },
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "规格列表",
        valueType: "collection" as const,
        itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
      },
    ];
    const sample = collectionSampleFromPayloadValues(
      {
        schemaVersion: "1.0.0",
        slots: {},
        values: {
          picked: [
            {
              name: "Aura",
              imageSrc: "https://example.com/spu.jpg",
              skus: [{ title: "黑", imageSrc: "https://example.com/sku.jpg" }],
            },
          ],
        },
      },
      "picked",
      itemFields
    );
    assert.ok(sample);
    const scalarFields = parentScalarItemFieldsFromItemFields(itemFields);
    const rows = buildRepeatListScalarFieldPickerRows(sample, scalarFields);
    assert.ok(!rows.some((r) => r.kind === "group"));
    assert.ok(!rows.some((r) => r.key.includes(".")));
    assert.ok(rows.some((r) => r.key === "name"));
    assert.ok(rows.some((r) => r.key === "imageSrc"));
    assert.equal(rows.some((r) => r.key === "skus"), false);
  });

  it("buildCollectionFieldPickerRows 将 skus.xxx 挂在 SKU 列表分组下", () => {
    const firstItem = {
      name: "Aura",
      skus: [{ imageSrc: "https://example.com/1.jpg", title: "黑" }],
    };
    const sample = { keys: listCatalogSourceFieldKeysForPicker(firstItem), firstItem };
    const itemFields = [
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
      },
    ];
    const rows = buildCollectionFieldPickerRows(sample, itemFields);
    const groupIdx = rows.findIndex((r) => r.kind === "group" && r.groupKey === "skus");
    const titleIdx = rows.findIndex((r) => r.key === "skus.title");
    assert.ok(groupIdx >= 0);
    assert.ok(titleIdx > groupIdx);
    assert.equal(rows[groupIdx]?.label, "SKU 列表");
    assert.equal(rows[groupIdx]?.typeLabel, "列表");
    assert.equal(rows[titleIdx]?.depth, 1);
    assert.equal(rows[titleIdx]?.groupKey, "skus");
  });

  it("buildCollectionFieldPickerOptions 展示 SKU 结构源字段中文名", () => {
    const firstItem = {
      name: "Aura",
      skus: [{ imageSrc: "https://example.com/1.jpg", salePrice: "$9" }],
    };
    const sample = { keys: listCatalogSourceFieldKeysForPicker(firstItem), firstItem };
    const options = buildCollectionFieldPickerOptions(sample, []);
    assert.equal(options.find((o) => o.key === "skus.imageSrc")?.label, "SKU 商品图");
    assert.equal(options.find((o) => o.key === "skus.imageSrc")?.typeLabel, "图片");
  });

  it("buildDefaultCollectionFieldMap 同名与大小写匹配", () => {
    const map = buildDefaultCollectionFieldMap(
      [
        { key: "title", label: "标题", valueType: "string" },
        { key: "iconSrc", label: "图标", valueType: "image" },
      ],
      ["title", "ICONSRC"]
    );
    assert.equal(map.title, "title");
    assert.equal(map.iconSrc, "ICONSRC");
  });

  it("parseCollectionJsonTextWithFieldMap 异名字段映射", () => {
    const json = JSON.stringify([{ name: "A", image_url: "https://example.com/a.png" }]);
    const itemFields = [
      { key: "title", label: "标题", valueType: "string" as const },
      { key: "iconSrc", label: "图标", valueType: "image" as const },
    ];
    const result = parseCollectionJsonTextWithFieldMap(json, itemFields, {
      title: "name",
      iconSrc: "image_url",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.items[0]?.title, "A");
    assert.equal(result.items[0]?.iconSrc, "https://example.com/a.png");
  });

  it("readCatalogSourceValue 解析 skus.xxx", () => {
    const row = {
      imageSrc: "spu.jpg",
      skus: [{ imageSrc: "sku.jpg", salePrice: "$1" }],
    };
    assert.equal(readCatalogSourceValue(row, "skus.imageSrc"), "sku.jpg");
    assert.equal(readCatalogSourceValue(row, "imageSrc"), "spu.jpg");
  });

  it("normalizeCollectionItemsWithFieldMap 嵌套 skus 子列表映射", () => {
    const rawItems = [
      {
        name: "Aura",
        skus: [
          {
            imageSrc: "https://example.com/sku.jpg",
            title: "黑",
            href: "https://shop.example/sku-1",
          },
        ],
      },
    ];
    const itemFields = [
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [
          { key: "imageSrc", label: "规格图", valueType: "image" as const },
          { key: "title", label: "规格名", valueType: "string" as const },
          { key: "href", label: "规格链接", valueType: "url" as const },
        ],
      },
    ];
    const result = normalizeCollectionItemsWithFieldMap(rawItems, itemFields, {
      name: "name",
      "skus.imageSrc": "skus.imageSrc",
      "skus.title": "skus.title",
      "skus.href": "skus.href",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const skus = result.items[0]?.skus as Record<string, unknown>[];
    assert.equal(skus[0]?.imageSrc, "https://example.com/sku.jpg");
    assert.equal(skus[0]?.title, "黑");
    assert.equal(skus[0]?.href, "https://shop.example/sku-1");
  });

  it("validateCollectionFieldMapDepth 拒绝跨层级映射", () => {
    const itemFields = [
      { key: "imageSrc", label: "商品图", valueType: "image" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
      },
    ];
    assert.equal(canBindTargetPathToSourceKey("imageSrc", "imageAlt"), true);
    assert.equal(canBindTargetPathToSourceKey("imageSrc", "skus.title"), false);
    assert.equal(canBindTargetPathToSourceKey("skus.title", "title"), false);
    assert.equal(canBindTargetPathToSourceKey("skus.title", "skus.title"), true);
    assert.equal(canBindTargetPathToSourceKey("skus.placeholder", "variants.title"), false);
    const bad = validateCollectionFieldMapDepth(itemFields, {
      imageSrc: "skus.imageSrc",
    });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.error, /一级列表列/);
  });

  it("buildDefaultCollectionFieldMap 不匹配跨层级默认同名", () => {
    const itemFields = [
      { key: "badge", label: "角标", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
      },
    ];
    const map = buildDefaultCollectionFieldMap(itemFields, ["badge", "skus.title"]);
    assert.equal(map.badge, "badge");
    assert.equal(map["skus.title"], "skus.title");
    assert.equal(map["skus.badge"], undefined);
  });

  it("buildDefaultCollectionFieldMap 匹配 skus.xxx 路径", () => {
    const itemFields = [
      { key: "name", label: "商品名", valueType: "string" as const },
      {
        key: "skus",
        label: "SKU 列表",
        valueType: "collection" as const,
        itemFields: [{ key: "imageSrc", label: "规格图", valueType: "image" as const }],
      },
    ];
    const map = buildDefaultCollectionFieldMap(itemFields, [
      "name",
      "skus.imageSrc",
      "skus.title",
    ]);
    assert.equal(map.name, "name");
    assert.equal(map["skus.imageSrc"], "skus.imageSrc");
  });

  it("normalizeCollectionItemsWithFieldMap 跨层级 fieldMap 失败", () => {
    const result = normalizeCollectionItemsWithFieldMap(
      [{ imageSrc: "a.jpg", skus: [{ title: "黑" }] }],
      [
        { key: "imageSrc", label: "图", valueType: "image" as const },
        {
          key: "skus",
          label: "SKU",
          valueType: "collection" as const,
          itemFields: [{ key: "title", label: "名", valueType: "string" as const }],
        },
      ],
      { "skus.title": "title" }
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /子列表列/);
  });

  it("normalizeCollectionItemsWithFieldMap 固定长度补空行", () => {
    const result = normalizeCollectionItemsWithFieldMap(
      [{ t: "only" }],
      [{ key: "title", label: "标题", valueType: "string" }],
      { title: "t" },
      { fixedLength: 2 }
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.items.length, 2);
    assert.equal(result.items[1]?.title, "");
  });
});
