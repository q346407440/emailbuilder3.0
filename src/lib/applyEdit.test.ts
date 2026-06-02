import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { applyBlockField, readFieldDisplay } from "./applyEdit";
import { validateRenderDefaultsForbiddenFields } from "../render-defaults-contract/validate";

function layoutRowTemplate(direction: "horizontal" | "vertical"): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    emailId: "t",
    templateId: "t",
    templateVersion: 1,
    locale: "zh-CN",
    rootBlockId: "root",
    blockMeta: {},
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["row"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {},
        bindings: {},
      },
      row: {
        id: "row",
        type: "layout",
        parentId: "root",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left" },
        },
        props: { direction, gapMode: "fixed", gap: "8px" },
        bindings: {},
      },
    },
  };
}

describe("applyBlockField · layout direction", () => {
  it("横改纵：保留双轴 contentAlign 并补齐缺失轴", () => {
    const template = layoutRowTemplate("horizontal");
    const { template: next } = applyBlockField(
      template,
      { schemaVersion: "1.0.0", slots: {}, values: {} },
      "row",
      "props.direction",
      "vertical"
    );
    const row = next.blocks.row as Extract<EmailTemplate["blocks"][string], { type: "layout" }>;
    assert.equal(row.props.direction, "vertical");
    assert.deepEqual(row.wrapperStyle?.contentAlign, { horizontal: "left", vertical: "top" });
    assert.equal(
      validateRenderDefaultsForbiddenFields(next).some((i) => i.path.includes("contentAlign.horizontal")),
      false
    );
  });

  it("纵改横：保留双轴 contentAlign 并补齐缺失轴", () => {
    const template = layoutRowTemplate("vertical");
    template.blocks.row.wrapperStyle = {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: { vertical: "center" },
    };
    const { template: next } = applyBlockField(
      template,
      { schemaVersion: "1.0.0", slots: {}, values: {} },
      "row",
      "props.direction",
      "horizontal"
    );
    const row = next.blocks.row as Extract<EmailTemplate["blocks"][string], { type: "layout" }>;
    assert.equal(row.props.direction, "horizontal");
    assert.deepEqual(row.wrapperStyle?.contentAlign, { horizontal: "left", vertical: "center" });
    assert.equal(
      validateRenderDefaultsForbiddenFields(next).some((i) => i.path.includes("contentAlign.vertical")),
      false
    );
  });
});

describe("readFieldDisplay · collection slotPath", () => {
  it("变量集合字段按 slotPath 回显当前生效值", () => {
    const template = layoutRowTemplate("vertical");
    const block = template.blocks.row;
    block.bindings = {
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

    assert.equal(
      readFieldDisplay(block, payload, "wrapperStyle.backgroundImage.src"),
      "https://example.com/from-payload.jpg"
    );
  });
});
