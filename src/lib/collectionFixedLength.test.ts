import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate, RepeatRegionBinding } from "../types/email";
import {
  applyCollectionFixedLengthChange,
  applyPayloadCollectionFixedLength,
  collectionFixedLengthEditability,
  readPayloadCollectionFixedLength,
  resolveRepeatExpansionMaxItems,
} from "./collectionFixedLength";
import { collectionItemCount } from "./repeatRegion";

function basePayload(): EmailPayload {
  return {
    slots: {
      products: {
        label: "商品列表",
        valueType: "collection",
        minItems: 2,
        maxItems: 2,
        itemFields: [
          { key: "name", label: "名称", valueType: "string", required: true },
        ],
        dataSource: { type: "custom" },
      },
      derived: {
        label: "相似品",
        valueType: "collection",
        minItems: 2,
        maxItems: 2,
        itemFields: [{ key: "name", label: "名称", valueType: "string", required: true }],
        dataSource: {
          type: "remote",
          provider: "builtin",
          catalog: "products",
          sort: { strategy: "similarTo", targetSlotId: "products" },
        },
      },
    },
    values: {
      products: [{ name: "A" }, { name: "B" }],
      derived: [{ name: "x" }, { name: "y" }],
    },
    schemaVersion: "1.0.0",
  };
}

describe("collectionFixedLength", () => {
  it("collectionFixedLengthEditability：派生列表不可编辑", () => {
    const payload = basePayload();
    const r = collectionFixedLengthEditability(payload, "derived");
    assert.equal(r.editable, false);
    assert.match(r.reason ?? "", /目标变量/);
  });

  it("collectionFixedLengthEditability：嵌套 repeat 不可编辑", () => {
    const payload = basePayload();
    const r = collectionFixedLengthEditability(payload, "products", {
      nestedRepeatItemPath: true,
    });
    assert.equal(r.editable, false);
  });

  it("applyPayloadCollectionFixedLength 同步 min/max 并 pad values", () => {
    const payload = basePayload();
    const next = applyPayloadCollectionFixedLength(payload, "products", 4);
    assert.equal(next.slots.products?.minItems, 4);
    assert.equal(next.slots.products?.maxItems, 4);
    const rows = next.values.products as Array<Record<string, unknown>>;
    assert.equal(rows.length, 4);
    assert.equal(readPayloadCollectionFixedLength(next, "products"), 4);
  });

  it("collectionFixedLengthEditability：专用对象变量不参与列表长度编辑", () => {
    const payload = basePayload();
    payload.slots.summary = {
      label: "正向GMV汇总",
      valueType: "object",
      builtinStructureId: "dedicated.loyalty.positiveGrowthGmvSummary",
      objectFields: [{ key: "title", label: "汇总标题", valueType: "string", required: true }],
    };
    payload.values.summary = { title: "使用会员折扣的GMV" };
    const r = collectionFixedLengthEditability(payload, "summary");
    assert.equal(r.editable, false);
    assert.match(r.reason ?? "", /对象变量/);
  });

  it("applyPayloadCollectionFixedLength：内置结构改展示长度不裁剪 mock values", () => {
    const payload = basePayload();
    payload.slots.products = {
      ...payload.slots.products!,
      builtinStructureId: "collection.productSpuWithSkus",
      minItems: 10,
      maxItems: 10,
    };
    payload.values.products = Array.from({ length: 10 }, (_item, index) => ({
      name: `Mock 商品 ${index + 1}`,
    }));
    const next = applyPayloadCollectionFixedLength(payload, "products", 3);
    assert.equal(next.slots.products?.minItems, 3);
    assert.equal(next.slots.products?.maxItems, 3);
    assert.equal((next.values.products as unknown[]).length, 10);
  });

  it("resolveRepeatExpansionMaxItems：顶层 repeat 以 payload.slots 为准", () => {
    const payload = basePayload();
    payload.slots.products = { ...payload.slots.products!, minItems: 10, maxItems: 10 };
    const repeat: RepeatRegionBinding = {
      mode: "collection",
      slotId: "products",
      prototypeChildIds: ["img"],
      fallbackChildIds: [],
      minItems: 4,
      maxItems: 4,
      itemFields: payload.slots.products.itemFields ?? [],
    };
    assert.equal(resolveRepeatExpansionMaxItems(repeat, payload), 10);
  });

  it("applyCollectionFixedLengthChange：同步 payload 与 template.repeat", () => {
    const payload = basePayload();
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "test",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "layout",
          parentId: null,
          children: ["img"],
          props: {},
        },
        img: {
          id: "img",
          type: "image",
          parentId: "root",
          children: [],
          props: {},
          repeat: {
            mode: "collection",
            slotId: "products",
            prototypeChildIds: ["img"],
            fallbackChildIds: [],
            minItems: 2,
            maxItems: 2,
            itemFields: payload.slots.products!.itemFields ?? [],
          },
        },
      },
    };
    const { template: nextTemplate, payload: nextPayload } = applyCollectionFixedLengthChange(
      template,
      payload,
      "products",
      6
    );
    assert.equal(nextPayload.slots.products?.minItems, 6);
    assert.equal(nextTemplate.blocks.img?.repeat?.maxItems, 6);
    assert.equal(
      collectionItemCount(nextPayload, nextTemplate.blocks.img!.repeat!),
      6
    );
  });
});
