import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BindingCollectionField } from "../types/email";
import {
  canDeclareCollectionItemFieldType,
  collectionItemFieldsNestingError,
  collectionItemFieldTypesForPicker,
  collectionItemFieldValueTypeLabel,
  countCollectionFieldsInItemPath,
  isItemPathWithinCollectionListLevelMax,
  normalizeCollectionItemFields,
} from "./collection-item-fields";
import { normalizeCollectionItemFieldValueType } from "./value-types";
import { validatePayloadSlotDefinition } from "./validate";

const scalar = (key: string): BindingCollectionField => ({
  key,
  label: key,
  valueType: "string",
});

const nestedSkus = (): BindingCollectionField => ({
  key: "skus",
  label: "SKU 列表",
  valueType: "collection",
  itemFields: [scalar("title")],
});

describe("collection itemFields 契约", () => {
  describe("类型（与标准标量一致 + 列表）", () => {
    it("可选类型含文本、数值、链接、列表", () => {
      assert.deepEqual(collectionItemFieldTypesForPicker(), [
        "string",
        "number",
        "url",
        "collection",
      ]);
    });

    it("image 归一为 url", () => {
      assert.equal(normalizeCollectionItemFieldValueType("image"), "url");
      const next = normalizeCollectionItemFields([
        { key: "imageSrc", label: "图", valueType: "image" },
      ]);
      assert.equal(next[0]?.valueType, "url");
    });

    it("展示名与标准标量一致", () => {
      assert.equal(collectionItemFieldValueTypeLabel("string"), "文本");
      assert.equal(collectionItemFieldValueTypeLabel("number"), "数值");
      assert.equal(collectionItemFieldValueTypeLabel("url"), "链接");
      assert.equal(collectionItemFieldValueTypeLabel("image"), "链接");
      assert.equal(collectionItemFieldValueTypeLabel("collection"), "列表");
    });
  });

  describe("最多 2 级列表", () => {
    it("depth 0 可声明子列表，depth 1 不可", () => {
      assert.equal(canDeclareCollectionItemFieldType(0), true);
      assert.equal(canDeclareCollectionItemFieldType(1), false);
    });

    it("三层 itemFields 嵌套应报错", () => {
      const itemFields: BindingCollectionField[] = [
        {
          key: "spu",
          label: "SPU",
          valueType: "collection",
          itemFields: [
            {
              key: "skus",
              label: "SKU",
              valueType: "collection",
              itemFields: [scalar("skuId")],
            },
          ],
        },
      ];
      assert.ok(collectionItemFieldsNestingError(itemFields, 0));
      const issues = validatePayloadSlotDefinition("slots.products", {
        label: "商品",
        valueType: "collection",
        itemFields,
      });
      assert.ok(issues.some((i) => i.path.includes("valueType")));
    });

    it("itemPath 超过一层 collection 不允许", () => {
      const itemFields: BindingCollectionField[] = [nestedSkus()];
      assert.equal(countCollectionFieldsInItemPath(itemFields, "skus"), 1);
      assert.equal(isItemPathWithinCollectionListLevelMax(itemFields, "skus"), true);

      const deep: BindingCollectionField[] = [
        {
          ...nestedSkus(),
          itemFields: [
            {
              key: "childList",
              label: "子子列表",
              valueType: "collection",
              itemFields: [scalar("x")],
            },
          ],
        },
      ];
      assert.equal(isItemPathWithinCollectionListLevelMax(deep, "skus.childList"), false);
    });
  });
});
