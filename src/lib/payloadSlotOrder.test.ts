import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload } from "../types/email";
import {
  getPayloadSlotIdsInOrder,
  removePayloadSlotFromOrder,
} from "./payloadSlotOrder";
import { registerPayloadSlot } from "./payloadSlotRegister";
import { collectPayloadVariableSlots } from "./payloadSlots";
import type { EmailTemplate } from "../types/email";

const emptyTemplate: EmailTemplate = {
  schemaVersion: "4.0.0",
  templateId: "t",
  templateVersion: 1,
  rootBlockId: "root",
  blocks: {
    root: {
      id: "root",
      type: "emailRoot",
      parentId: null,
      children: [],
      props: { width: "600px" },
    },
  },
};

describe("payloadSlotOrder", () => {
  it("无 slotOrder 时按 slots 对象 key 顺序", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        zLast: { label: "Z", valueType: "string" },
        aFirst: { label: "A", valueType: "string" },
      },
      values: {},
    };
    assert.deepEqual(getPayloadSlotIdsInOrder(payload), ["zLast", "aFirst"]);
  });

  it("registerPayloadSlot 新建变量追加到 slotOrder 末尾", () => {
    const base: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        first: { label: "一", valueType: "string" },
      },
      values: { first: "" },
      slotOrder: ["first"],
    };
    const next = registerPayloadSlot(
      base,
      "second",
      { label: "二", valueType: "string" },
      ""
    );
    assert.deepEqual(next.slotOrder, ["first", "second"]);
    assert.deepEqual(getPayloadSlotIdsInOrder(next), ["first", "second"]);
  });

  it("collectPayloadVariableSlots 按创建顺序而非 slotId 字母序", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slotOrder: ["loyaltyData", "loyaltyMerchantProductList", "loyaltyAbnormal"],
      slots: {
        loyaltyAbnormal: { label: "异常", valueType: "collection", itemFields: [] },
        loyaltyData: { label: "数据", valueType: "collection", itemFields: [] },
        loyaltyMerchantProductList: { label: "商品", valueType: "collection", itemFields: [] },
      },
      values: {
        loyaltyAbnormal: [],
        loyaltyData: [],
        loyaltyMerchantProductList: [],
      },
    };
    const ids = collectPayloadVariableSlots(emptyTemplate, payload).map((s) => s.slotId);
    assert.deepEqual(ids, ["loyaltyData", "loyaltyMerchantProductList", "loyaltyAbnormal"]);
  });

  it("removePayloadSlotFromOrder 删除登记项", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slotOrder: ["a", "b", "c"],
      slots: {
        a: { label: "A", valueType: "string" },
        c: { label: "C", valueType: "string" },
      },
      values: {},
    };
    const next = removePayloadSlotFromOrder(payload, "b");
    assert.deepEqual(next.slotOrder, ["a", "c"]);
  });
});
