import assert from "node:assert";
import { describe, it } from "node:test";
import { getVisibilityOperatorsForValueType } from "../visibility-contract";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { updateExternalVariableSlotValueType } from "../lib/externalVariableSlotEdit";
import { resolveEffectiveBindingSlotValueType } from "./repeat-list-item-binding";
import {
  filterSlotsForVisibilityPicker,
  filterSlotsForVariablePicker,
  inferBindingValueTypeRequirement,
  inferVariablePickerPurpose,
  slotValueTypeMatchesPickerPurpose,
  validateVariableBindingFieldCompatibility,
  VARIABLE_SLOT_BINDING_RULES,
} from "./variable-slot-compatibility";

const textBlock = (): EmailBlock => ({
  id: "t",
  type: "text",
  parentId: "root",
  children: [],
  props: {
    textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
    bold: false,
    italic: false,
    decoration: "none",
    color: "#111111",
    fontSize: "14px",
  },
});

describe("VARIABLE_SLOT_BINDING_RULES", () => {
  it("规则目录与 contentText 白名单一致", () => {
    const rule = VARIABLE_SLOT_BINDING_RULES.find((r) => r.purpose === "contentText");
    assert.deepEqual(rule?.allowedSlotTypes, ["string", "number", "url"]);
  });
});

describe("variable-slot-compatibility", () => {
  it("链接路径推断为 url", () => {
    assert.equal(
      inferBindingValueTypeRequirement(textBlock(), "props.textBody.paragraphs.0.runs.0.link"),
      "url"
    );
    assert.equal(
      inferVariablePickerPurpose(textBlock(), "props.textBody.paragraphs.0.runs.0.link"),
      "contentUrl"
    );
  });

  it("通用文本路径允许 string、number、url 变量", () => {
    const purpose = inferVariablePickerPurpose(textBlock(), "props.text");
    assert.equal(purpose, "contentText");
    assert.equal(slotValueTypeMatchesPickerPurpose("url", purpose), true);
  });

  it("按钮文案仅允许 string 与 number", () => {
    const button = textBlock();
    button.type = "button";
    const purpose = inferVariablePickerPurpose(button, "props.text");
    assert.equal(purpose, "contentButtonText");
    assert.equal(slotValueTypeMatchesPickerPurpose("url", purpose), false);
  });

  it("validateVariableBindingFieldCompatibility 拒绝按钮文案绑 url", () => {
    const button = textBlock();
    button.type = "button";
    const issue = validateVariableBindingFieldCompatibility(button, "props.text", "url");
    assert.ok(issue?.reason.includes("不兼容"));
  });

  it("裸 collection 类型仍与文本字段不兼容", () => {
    const issue = validateVariableBindingFieldCompatibility(textBlock(), "props.text", "collection");
    assert.ok(issue?.reason.includes("不兼容"));
  });

  it("resolveEffectiveBindingSlotValueType：binding 自带 itemFields 时无需 template", () => {
    const effective = resolveEffectiveBindingSlotValueType({
      valueType: "collection",
      slotPath: "0.iconSrc",
      slotId: "benefits",
      itemFields: [{ key: "iconSrc", label: "图标", valueType: "image", required: true }],
    });
    assert.equal(effective, "image");
  });

  it("filterSlotsForVariablePicker", () => {
    const slots = [
      { slotId: "a", valueType: "string" },
      { slotId: "b", valueType: "number" },
      { slotId: "c", valueType: "url" },
    ];
    const filtered = filterSlotsForVariablePicker(slots, "contentText");
    assert.deepEqual(filtered.map((s) => s.slotId), ["a", "b", "c"]);
  });

  it("布尔显隐运算符含为空/不为空与为真/为假", () => {
    const ops = getVisibilityOperatorsForValueType("boolean").map((o) => o.operator);
    assert.deepEqual(ops, ["isEmpty", "isNotEmpty", "isTrue", "isFalse"]);
  });

  it("filterSlotsForVisibilityPicker 排除颜色型业务变量", () => {
    const slots = [
      { slotId: "name", valueType: "string" },
      { slotId: "accent", valueType: "color" },
      { slotId: "vip", valueType: "boolean" },
    ];
    const filtered = filterSlotsForVisibilityPicker(slots);
    assert.deepEqual(filtered.map((s) => s.slotId), ["name", "vip"]);
  });
});

describe("updateExternalVariableSlotValueType", () => {
  it("同步 payload.slots 与模板绑定 valueType", () => {
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["t"],
          props: {
            backgroundColor: "#ffffff",
            pageInline: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
          },
        },
        t: {
          id: "t",
          type: "text",
          parentId: "root",
          children: [],
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "hi" }] }] },
            bold: false,
            italic: false,
            decoration: "none",
            color: "#111111",
            fontSize: "14px",
          },
          bindings: {
            "props.textBody.paragraphs.0.runs.0.text": {
              mode: "variable",
              allowExternal: true,
              slotId: "qty",
              valueType: "string",
            },
          },
        },
      },
      blockMeta: {},
    };
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: { qty: { label: "数量", valueType: "string" } },
      values: { qty: "10" },
    };
    const next = updateExternalVariableSlotValueType(template, payload, "qty", "number");
    assert.equal(next.payload.slots.qty?.valueType, "number");
    assert.equal(next.template.blocks.t.bindings?.["props.textBody.paragraphs.0.runs.0.text"]?.valueType, "number");
  });
});
