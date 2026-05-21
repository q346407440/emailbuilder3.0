import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import {
  renameExternalVariableSlot,
  updateExternalVariableSlotLabel,
} from "./externalVariableSlotEdit";

function minimalTemplate(bindings: Record<string, unknown>): EmailTemplate {
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
          textBody: { version: 1, paragraphs: [{ runs: [{ text: "Hi {{ memberName }}!" }] }] },
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#111",
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: bindings as EmailTemplate["blocks"][string]["bindings"],
      },
    },
  };
}

describe("externalVariableSlotEdit", () => {
  it("updateExternalVariableSlotLabel 写入 payload.slots", () => {
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        memberName: { label: "旧名", valueType: "string" },
      },
      values: {},
    };
    const next = updateExternalVariableSlotLabel(payload, "memberName", "会员姓名");
    assert.equal(next.slots.memberName?.label, "会员姓名");
  });

  it("renameExternalVariableSlot 同步 payload 与 interpolate 占位符", () => {
    const template = minimalTemplate({
      "props.textBody.paragraphs.0.runs.0.text": {
        mode: "interpolate",
        slotId: "line",
        interpolationSlots: [
          {
            slotId: "memberName",
            valueType: "string",
            allowExternal: true,
            label: "会员姓名",
          },
        ],
      },
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: { memberName: { label: "会员姓名", valueType: "string" } },
      values: { memberName: "Alice" },
    };
    const result = renameExternalVariableSlot(template, payload, "memberName", "customerName");
    assert.equal(result.error, undefined);
    assert.equal(result.payload.values.customerName, "Alice");
    assert.equal(result.payload.values.memberName, undefined);
    assert.equal(
      result.template.blocks.root?.props.textBody?.paragraphs[0]?.runs[0]?.text,
      "Hi {{ customerName }}!"
    );
    assert.equal(
      result.template.blocks.root?.bindings?.["props.textBody.paragraphs.0.runs.0.text"]
        ?.interpolationSlots?.[0]?.slotId,
      "customerName"
    );
    assert.equal(result.payload.slots.customerName?.label, "会员姓名");
    assert.equal(result.payload.slots.memberName, undefined);
  });

  it("renameExternalVariableSlot 拒绝重复 slotId", () => {
    const template: EmailTemplate = {
      ...minimalTemplate({
        "props.textBody.paragraphs.0.runs.0.text": {
          mode: "variable",
          allowExternal: true,
          slotId: "a",
          valueType: "string",
        },
      }),
    };
    template.blocks.other = {
      ...template.blocks.root!,
      id: "other",
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          mode: "variable",
          allowExternal: true,
          slotId: "b",
          valueType: "string",
        },
      },
    };
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        a: { label: "A", valueType: "string" },
        b: { label: "B", valueType: "string" },
      },
      values: { a: "1", b: "2" },
    };
    const result = renameExternalVariableSlot(template, payload, "a", "b");
    assert.ok(result.error?.includes("已被"));
  });
});
