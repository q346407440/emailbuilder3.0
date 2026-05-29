import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailTemplate } from "../types/email";
import { collectExternalVariableSlots, collectScalarExternalVariableSlots } from "./payloadSlots";
import type { EmailPayload } from "../types/email";

function block(
  id: string,
  parentId: string | null,
  children: string[],
  bindings?: EmailBlock["bindings"]
): EmailBlock {
  return {
    id,
    type: "text",
    parentId,
    children,
    props: {
      content: "<p>x</p>",
      textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
      fontSize: "14px",
      color: "#111",
      bold: false,
      italic: false,
      decoration: "none",
    },
    ...(bindings ? { bindings } : {}),
  };
}

describe("collectExternalVariableSlots", () => {
  it("按区块树文档顺序排序变量槽", () => {
    const template: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: block("root", null, ["b", "a"]),
        a: {
          ...block("a", "root", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "slotA",
              mode: "variable",
              allowExternal: true,
              valueType: "string",
            },
          }),
        },
        b: {
          ...block("b", "root", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "slotB",
              mode: "variable",
              allowExternal: true,
              valueType: "string",
            },
          }),
        },
      },
    };

    const slots = collectExternalVariableSlots(template);
    assert.deepEqual(
      slots.map((slot) => slot.slotId),
      ["slotB", "slotA"]
    );
    assert.equal(slots[0]?.primaryBlockId, "b");
    assert.equal(slots[1]?.primaryBlockId, "a");
  });

  it("多区块绑定时 primaryBlockId 为最近公共父级", () => {
    const template: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: block("root", null, ["mod"]),
        mod: block("mod", "root", ["grid"]),
        grid: block("grid", "mod", ["cell1", "cell2"]),
        cell1: block("cell1", "grid", ["img1"]),
        cell2: block("cell2", "grid", ["img2"]),
        img1: {
          ...block("img1", "cell1", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "items",
              mode: "variable",
              allowExternal: true,
              valueType: "string",
            },
          }),
        },
        img2: {
          ...block("img2", "cell2", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "items",
              mode: "variable",
              allowExternal: true,
              valueType: "string",
            },
          }),
        },
      },
    };

    const slots = collectExternalVariableSlots(template);
    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.primaryBlockId, "grid");
  });

  it("汇总数组变量槽位的编辑元信息", () => {
    const template: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: block("root", null, ["a"]),
        a: {
          ...block("a", "root", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "items",
              mode: "variable",
              allowExternal: true,
              valueType: "collection",
              slotPath: "0.name",
              label: "商品列表",
              defaultValue: [{ name: "Cloud" }],
              itemFields: [{ key: "name", label: "商品名称", valueType: "string" }],
              minItems: 1,
              maxItems: 6,
            },
          }),
        },
      },
    };

    const slots = collectExternalVariableSlots(template);

    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.slotId, "items");
    assert.equal(slots[0]?.label, "商品列表");
    assert.deepEqual(slots[0]?.itemFields, [{ key: "name", label: "商品名称", valueType: "string" }]);
    assert.equal(slots[0]?.minItems, 1);
    assert.equal(slots[0]?.maxItems, 6);
  });

  it("汇总 interpolate 中声明的原子变量槽", () => {
    const template: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: block("root", null, ["a"]),
        a: {
          ...block("a", "root", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "greetingLine",
              mode: "interpolate",
              fieldKind: "content",
              interpolationSlots: [
                {
                  slotId: "memberName",
                  valueType: "string",
                  allowExternal: true,
                  defaultValue: "Member Name",
                  label: "会员姓名",
                },
              ],
            },
          }),
        },
      },
    };

    const slots = collectExternalVariableSlots(template);

    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.slotId, "memberName");
    assert.equal(slots[0]?.label, "会员姓名");
    assert.equal(slots[0]?.defaultValue, "Member Name");
    assert.equal(slots[0]?.primaryBlockId, "a");
  });
});

describe("collectScalarExternalVariableSlots", () => {
  it("payload 中仍有值但模板无绑定的标量槽仍出现在列表", () => {
    const template: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: block("root", null, ["para"]),
        para: {
          ...block("para", "root", [], {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "storeUrl",
              mode: "variable",
              allowExternal: true,
              valueType: "url",
              label: "店铺链接",
            },
          }),
        },
      },
    };
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        storeName: { label: "店铺名称", valueType: "string" },
        storeUrl: { label: "店铺链接", valueType: "url" },
      },
      values: {
        storeName: "zyzshop1",
        storeUrl: "https://example.com/store",
      },
    };

    const slots = collectScalarExternalVariableSlots(template, payload);
    const ids = slots.map((s) => s.slotId);
    assert.ok(ids.includes("storeUrl"));
    assert.ok(ids.includes("storeName"));
    const storeName = slots.find((s) => s.slotId === "storeName");
    assert.equal(storeName?.label, "店铺名称");
    assert.equal(storeName?.valueType, "string");
    assert.equal(storeName?.bindings.length, 0);
  });
});
