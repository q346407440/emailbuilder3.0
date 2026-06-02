import assert from "node:assert";
import { describe, it } from "node:test";
import type { EmailPayload } from "../types/email";
import { createCollectionPayloadSlot, createScalarPayloadSlot } from "./createPayloadSlot";

const basePayload = (): EmailPayload => ({
  schemaVersion: "1.0.0",
  slots: {},
  values: {},
});

describe("createPayloadSlot", () => {
  it("创建标量变量：名称与 key 必填，初值可空", () => {
    const result = createScalarPayloadSlot(basePayload(), {
      slotId: "newVar",
      label: "新变量",
      valueType: "string",
      initialValue: "",
    });
    assert.ok("payload" in result);
    assert.equal(result.payload.slots.newVar?.label, "新变量");
    assert.equal(result.payload.slots.newVar?.valueType, "string");
    assert.equal(result.payload.values.newVar, undefined);
  });

  it("创建标量变量：写入初值", () => {
    const result = createScalarPayloadSlot(basePayload(), {
      slotId: "shopUrl",
      label: "店铺链接",
      valueType: "url",
      initialValue: "https://example.com",
    });
    assert.ok("payload" in result);
    assert.equal(result.payload.slots.shopUrl?.valueType, "url");
    assert.equal(result.payload.values.shopUrl, "https://example.com");
  });

  it("创建标量变量：数值类型", () => {
    const result = createScalarPayloadSlot(basePayload(), {
      slotId: "qty",
      label: "数量",
      valueType: "number",
      initialValue: "42",
    });
    assert.ok("payload" in result);
    assert.equal(result.payload.slots.qty?.valueType, "number");
    assert.equal(result.payload.values.qty, 42);
  });

  it("创建列表变量：登记 collection，行字段与 values 待后续配置", () => {
    const result = createCollectionPayloadSlot(basePayload(), {
      slotId: "items",
      label: "商品列表",
    });
    assert.ok("payload" in result);
    assert.equal(result.payload.slots.items?.valueType, "collection");
    assert.equal(result.payload.slots.items?.itemFields, undefined);
    assert.equal(result.payload.values.items, undefined);
  });

  it("拒绝重复 key", () => {
    const payload: EmailPayload = {
      ...basePayload(),
      slots: { existing: { label: "已有", valueType: "string" } },
    };
    const result = createScalarPayloadSlot(payload, {
      slotId: "existing",
      label: "重复",
      valueType: "string",
    });
    assert.ok("error" in result);
    assert.ok(result.fieldErrors?.slotId);
  });
});
