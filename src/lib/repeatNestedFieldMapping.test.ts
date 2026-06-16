import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRepeatFieldMappingCollectionSlotPath,
  enrichNestedRepeatPreviewRowsForInspector,
  findEnclosingParentRepeatBinding,
  listRepeatFieldMappingScalarFields,
  resolveRepeatFieldMappingValue,
} from "./repeatNestedFieldMapping";
import type { EmailTemplate, RepeatRegionBinding } from "../types/email";

describe("repeatNestedFieldMapping", () => {
  const parentRepeat: RepeatRegionBinding = {
    mode: "collection",
    slotId: "products",
    prototypeChildIds: ["card"],
    fallbackChildIds: [],
    itemFields: [
      { key: "name", label: "商品名", valueType: "string" as const },
      { key: "salePrice", label: "现价", valueType: "string" as const },
      {
        key: "skus",
        label: "规格",
        valueType: "collection" as const,
        itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
      },
    ],
    fieldMappings: [],
  };

  const nestedRepeat: RepeatRegionBinding = {
    mode: "collection",
    slotId: "products",
    prototypeChildIds: ["desc"],
    fallbackChildIds: [],
    itemPath: "skus",
    itemFields: [{ key: "title", label: "规格名", valueType: "string" as const }],
    fieldMappings: [],
  };

  it("listRepeatFieldMappingScalarFields 嵌套绑定时仅含子列表列", () => {
    const fields = listRepeatFieldMappingScalarFields(nestedRepeat, parentRepeat);
    assert.equal(fields.length, 1);
    assert.equal(fields[0]?.key, "title");
    assert.ok(!fields.some((f) => f.key.startsWith("parent.")));
  });

  it("resolveRepeatFieldMappingValue 从父项读取 parent. 字段", () => {
    const parentItem = { name: "Aura", salePrice: "$79" };
    const skuItem = { title: "黑" };
    assert.equal(
      resolveRepeatFieldMappingValue(
        {
          id: "1",
          sourcePath: "parent.name",
          targetBlockId: "t",
          targetBindPath: "props.text",
        },
        skuItem,
        parentItem
      ),
      "Aura"
    );
    assert.equal(
      resolveRepeatFieldMappingValue(
        {
          id: "2",
          sourcePath: "title",
          targetBlockId: "t",
          targetBindPath: "props.text",
        },
        skuItem,
        parentItem
      ),
      "黑"
    );
  });

  it("buildRepeatFieldMappingCollectionSlotPath 父项字段用父行路径", () => {
    assert.equal(
      buildRepeatFieldMappingCollectionSlotPath(
        {
          id: "1",
          sourcePath: "parent.name",
          targetBlockId: "t",
          targetBindPath: "props.text",
        },
        "0.skus.2",
        "0"
      ),
      "0.name"
    );
    assert.equal(
      buildRepeatFieldMappingCollectionSlotPath(
        {
          id: "2",
          sourcePath: "title",
          targetBlockId: "t",
          targetBindPath: "props.text",
        },
        "0.skus.2",
        "0"
      ),
      "0.skus.2.title"
    );
  });

  it("findEnclosingParentRepeatBinding 行内子块跳过当前列表宿主", () => {
    const template = {
      blocks: {
        card: {
          id: "card",
          type: "layout",
          parentId: "root",
          children: ["desc"],
          repeat: {
            mode: "collection",
            slotId: "products",
            prototypeChildIds: ["card"],
            itemFields: [
              {
                key: "skus",
                label: "规格",
                valueType: "collection",
                itemFields: [{ key: "title", label: "规格名", valueType: "string" }],
              },
            ],
            fieldMappings: [],
          },
        },
        desc: {
          id: "desc",
          type: "layout",
          parentId: "card",
          children: ["desc-text"],
          repeat: {
            mode: "collection",
            slotId: "products",
            itemPath: "skus",
            prototypeChildIds: ["desc"],
            itemFields: [{ key: "title", label: "规格名", valueType: "string" }],
            fieldMappings: [],
          },
        },
        "desc-text": {
          id: "desc-text",
          type: "text",
          parentId: "desc",
          children: [],
        },
      },
    } as unknown as EmailTemplate;

    assert.equal(
      findEnclosingParentRepeatBinding(template, "desc-text", { skipRepeatHostId: "desc" })?.itemPath,
      undefined
    );
    assert.equal(
      findEnclosingParentRepeatBinding(template, "desc-text", { skipRepeatHostId: "desc" })?.slotId,
      "products"
    );
    assert.equal(findEnclosingParentRepeatBinding(template, "desc")?.slotId, "products");
  });

  it("enrichNestedRepeatPreviewRowsForInspector 仅返回子列表行", () => {
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {},
      values: {
        products: [
          {
            name: "Aura",
            salePrice: "$79",
            skus: [{ title: "黑" }, { title: "白" }],
          },
        ],
      },
    };
    const rows = enrichNestedRepeatPreviewRowsForInspector(
      nestedRepeat,
      payload,
      [],
      parentRepeat
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.title, "黑");
    assert.equal(rows[0]?.["parent.name"], undefined);
  });
});
