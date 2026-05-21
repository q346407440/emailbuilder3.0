import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { mergeTemplatePayload } from "./merge";

function minimalTemplateWithBinding(): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "text",
        parentId: null,
        children: [],
        props: {
          textBody: { version: 1, paragraphs: [{ runs: [{ text: "x" }] }] },
          color: "#111111",
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {
          "props.color": {
            slotId: "bodyColor",
            mode: "variable",
            allowExternal: true,
            defaultValue: "#111111",
          },
        },
      },
    },
  };
}

describe("mergeTemplatePayload 与 detachedVariableSlotIds", () => {
  it("未解除时仍用 values 覆盖模板", () => {
    const template = minimalTemplateWithBinding();
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { bodyColor: "#ff0000" },
    };
    const merged = mergeTemplatePayload(template, payload);
    assert.equal((merged.blocks.root.props as { color?: string }).color, "#ff0000");
  });

  it("解除跟随的槽位不再合并 values", () => {
    const template = minimalTemplateWithBinding();
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { bodyColor: "#ff0000" },
      detachedVariableSlotIds: ["bodyColor"],
    };
    const merged = mergeTemplatePayload(template, payload);
    assert.equal((merged.blocks.root.props as { color?: string }).color, "#111111");
  });

  it("支持通过 slotPath 读取数组槽位里的字段", () => {
    const template = minimalTemplateWithBinding();
    template.blocks.root.bindings = {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "items",
        mode: "variable",
        allowExternal: true,
        valueType: "collection",
        slotPath: "0.name",
        defaultValue: [{ name: "默认商品" }],
        itemFields: [{ key: "name", label: "商品名称", valueType: "string" }],
      },
    };
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { items: [{ name: "Cloud" }] },
    };

    const merged = mergeTemplatePayload(template, payload);

    const mergedProps = merged.blocks.root.props as {
      textBody?: { paragraphs: Array<{ runs: Array<{ text?: string }> }> };
    };
    assert.equal(mergedProps.textBody?.paragraphs[0]?.runs[0]?.text, "Cloud");
  });

  it("支持文本字段内按 payload 原子槽插值", () => {
    const template = minimalTemplateWithBinding();
    template.blocks.root.props = {
      textBody: {
        version: 1,
        paragraphs: [{ runs: [{ text: "Hi {{ memberName }}, welcome." }] }],
      },
      bold: false,
      italic: false,
      decoration: "none",
    };
    template.blocks.root.bindings = {
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
    };
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { memberName: "Alice" },
    };

    const merged = mergeTemplatePayload(template, payload);

    assert.equal(
      (merged.blocks.root.props as { textBody?: { paragraphs: Array<{ runs: Array<{ text: string }> }> } }).textBody
        ?.paragraphs[0]?.runs[0]?.text,
      "Hi Alice, welcome."
    );
  });

  it("关闭背景图后不会被 payload 合并重新创建", () => {
    const template = minimalTemplateWithBinding();
    template.blocks.root.type = "layout";
    template.blocks.root.props = { direction: "vertical", gapMode: "fixed", gap: "0" };
    template.blocks.root.wrapperStyle = { heightMode: "fixed", height: "140px" };
    template.blocks.root.bindings = {
      "wrapperStyle.backgroundImage.src": {
        slotId: "items",
        mode: "variable",
        allowExternal: true,
        valueType: "collection",
        slotPath: "0.imageSrc",
        defaultValue: [{ imageSrc: "https://example.com/default.jpg" }],
        itemFields: [{ key: "imageSrc", label: "商品图", valueType: "image" }],
      },
    };
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { items: [{ imageSrc: "https://example.com/from-payload.jpg" }] },
    };

    const merged = mergeTemplatePayload(template, payload);

    assert.equal(merged.blocks.root.wrapperStyle?.backgroundImage, undefined);
  });
});
