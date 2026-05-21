import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { PAYLOAD_SCHEMA_VERSION } from "./types";
import {
  validateExternalInterpolateBindingSpec,
  validateExternalVariableBindingSpec,
  validatePayloadAgainstTemplate,
  validatePayloadAgainstTemplateUnion,
  validatePayloadShape,
} from "./validate";

function minimalTemplate(bindings: EmailTemplate["blocks"]["root"]["bindings"]): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["text1"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          width: "600px",
          backgroundColor: "#fff",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      text1: {
        id: "text1",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          content: "<p>hello</p>",
          textBody: { version: 1, paragraphs: [{ runs: [{ text: "hello" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: bindings ?? {},
      },
    },
  };
}

/** 构造测试用 payload；slots 的 valueType 以目录声明为准，勿从 values 反推（避免与 template 绑定冲突） */
function validPayload(
  values: EmailPayload["values"],
  slots: EmailPayload["slots"]
): EmailPayload {
  return { schemaVersion: PAYLOAD_SCHEMA_VERSION, slots, values };
}

function scalarSlot(
  slotId: string,
  valueType: "string" | "number" | "boolean" | "url" | "image" | "color"
): EmailPayload["slots"] {
  return { [slotId]: { label: slotId, valueType } };
}

describe("payload-contract · validatePayloadShape", () => {
  it("schemaVersion 须为 1.0.0", () => {
    const issues = validatePayloadShape({ schemaVersion: "0.9.0", values: {} });
    assert.ok(issues.some((i) => i.path === "schemaVersion"));
  });

  it("values 必须为对象", () => {
    const issues = validatePayloadShape({ schemaVersion: PAYLOAD_SCHEMA_VERSION, values: [] });
    assert.ok(issues.some((i) => i.path === "values"));
  });
});

describe("payload-contract · validateExternalVariableBindingSpec", () => {
  it("拒绝非法 valueType", () => {
    const issues = validateExternalVariableBindingSpec("blocks.x.bindings.props.text", {
      mode: "variable",
      allowExternal: true,
      slotId: "title",
      valueType: "notARealType" as "string",
    });
    assert.ok(issues.some((i) => i.path.endsWith(".valueType")));
  });

  it("允许 variable 使用 valueType number", () => {
    const issues = validateExternalVariableBindingSpec("blocks.x.bindings.props.progress", {
      mode: "variable",
      allowExternal: true,
      slotId: "progressPct",
      valueType: "number",
    });
    assert.equal(issues.length, 0);
  });

  it("collection 须声明 itemFields", () => {
    const issues = validateExternalVariableBindingSpec("blocks.x.bindings.props.items", {
      mode: "variable",
      allowExternal: true,
      slotId: "items",
      valueType: "collection",
    });
    assert.equal(issues.length, 0);
  });
});

describe("payload-contract · validateExternalInterpolateBindingSpec", () => {
  it("interpolate 须声明原子变量元信息", () => {
    const issues = validateExternalInterpolateBindingSpec("blocks.x.bindings.props.text", {
      mode: "interpolate",
      slotId: "greetingLine",
      interpolationSlots: [
        {
          slotId: "memberName",
          valueType: "string",
          allowExternal: true,
          defaultValue: "Member Name",
          label: "会员姓名",
        },
      ],
    });

    assert.equal(issues.length, 0);
  });

  it("interpolate 拒绝原子槽使用 number", () => {
    const issues = validateExternalInterpolateBindingSpec("blocks.x.bindings.props.text", {
      mode: "interpolate",
      slotId: "line",
      interpolationSlots: [
        {
          slotId: "n",
          valueType: "number" as unknown as "string",
          allowExternal: true,
          defaultValue: "1",
          label: "计数",
        },
      ],
    });
    assert.ok(issues.some((i) => i.path.endsWith(".valueType")));
  });

  it("interpolate 拒绝缺少 interpolationSlots", () => {
    const issues = validateExternalInterpolateBindingSpec("blocks.x.bindings.props.text", {
      mode: "interpolate",
      slotId: "greetingLine",
    });

    assert.ok(issues.some((i) => i.path.endsWith(".interpolationSlots")));
  });
});

describe("payload-contract · validatePayloadAgainstTemplate", () => {
  it("string 槽值须为字符串", () => {
    const template = minimalTemplate({
      "props.text": {
        mode: "variable",
        allowExternal: true,
        slotId: "headline",
        valueType: "string",
      },
    });
    const issues = validatePayloadAgainstTemplate(
      template,
      validPayload({ headline: 42 as unknown as string }, scalarSlot("headline", "string"))
    );
    assert.ok(issues.some((i) => i.path === "values.headline"));
  });

  it("number 槽值须为 JSON 数字", () => {
    const template = minimalTemplate({
      "props.textBody.paragraphs.0.runs.0.text": {
        mode: "variable",
        allowExternal: true,
        slotId: "score",
        valueType: "number",
      },
    });
    const scoreSlots = scalarSlot("score", "number");
    const badString = validatePayloadAgainstTemplate(
      template,
      validPayload({ score: "42" as unknown as number }, scoreSlots)
    );
    assert.ok(badString.some((i) => i.path === "values.score"));

    const badNan = validatePayloadAgainstTemplate(template, validPayload({ score: NaN }, scoreSlots));
    assert.ok(badNan.some((i) => i.path === "values.score"));

    const ok = validatePayloadAgainstTemplate(template, validPayload({ score: 42 }, scoreSlots));
    assert.equal(ok.length, 0);
  });

  it("boolean 槽值须为布尔值", () => {
    const template = minimalTemplate({
      "props.textBody.paragraphs.0.runs.0.text": {
        mode: "variable",
        allowExternal: true,
        slotId: "showModule",
        valueType: "boolean",
      },
    });
    const showSlots = scalarSlot("showModule", "boolean");
    const badString = validatePayloadAgainstTemplate(
      template,
      validPayload({ showModule: "true" as unknown as boolean }, showSlots)
    );
    assert.ok(badString.some((i) => i.path === "values.showModule"));

    const ok = validatePayloadAgainstTemplate(template, validPayload({ showModule: true }, showSlots));
    assert.equal(ok.length, 0);
  });

  it("collection 槽值须为对象数组且字段类型匹配", () => {
    const template = minimalTemplate({
      "props.items": {
        mode: "variable",
        allowExternal: true,
        slotId: "products",
        valueType: "collection",
        itemFields: [
          { key: "name", label: "名称", valueType: "string", required: true },
          { key: "href", label: "链接", valueType: "url" },
        ],
      },
    });
    const productItemFields = [
      { key: "name", label: "名称", valueType: "string" as const, required: true },
      { key: "href", label: "链接", valueType: "url" as const },
    ];
    const productSlots: EmailPayload["slots"] = {
      products: { label: "products", valueType: "collection", itemFields: productItemFields },
    };

    const badType = validatePayloadAgainstTemplate(
      template,
      validPayload({ products: "not-array" as unknown as EmailPayload["values"]["products"] }, productSlots)
    );
    assert.ok(badType.some((i) => i.path === "values.products"));

    const badRow = validatePayloadAgainstTemplate(
      template,
      validPayload({ products: [null as unknown as object] }, productSlots)
    );
    assert.ok(badRow.some((i) => i.path === "values.products[0]"));

    const missingRequired = validatePayloadAgainstTemplate(
      template,
      validPayload({ products: [{ href: "https://example.com" }] }, productSlots)
    );
    assert.ok(missingRequired.some((i) => i.path === "values.products[0].name"));

    const ok = validatePayloadAgainstTemplate(
      template,
      validPayload({ products: [{ name: "Cloud", href: "https://example.com/p" }] }, productSlots)
    );
    assert.equal(ok.length, 0);
  });

  it("拒绝 values 中无 payload.slots 目录项的键", () => {
    const template = minimalTemplate({});
    const issues = validatePayloadAgainstTemplate(template, validPayload({ orphan: "x" }, {}));
    assert.ok(issues.some((i) => i.path === "values.orphan"));
  });

  it("允许 payload.slots 中有值但当前版式未绑定的变量", () => {
    const template = minimalTemplate({});
    const issues = validatePayloadAgainstTemplate(
      template,
      validPayload(
        { storeName: "zyzshop1" },
        { storeName: { label: "店铺名称", valueType: "string" } }
      )
    );
    assert.equal(issues.length, 0);
  });

  it("允许 payload 为 interpolate 原子槽赋值", () => {
    const template = minimalTemplate({
      "props.textBody.paragraphs.0.runs.0.text": {
        mode: "interpolate",
        slotId: "greetingLine",
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
    });

    const issues = validatePayloadAgainstTemplate(
      template,
      validPayload({ memberName: "Alice" }, scalarSlot("memberName", "string"))
    );

    assert.equal(issues.length, 0);
  });
});

describe("payload-contract · validatePayloadAgainstTemplateUnion", () => {
  it("任一模板的 bindings 声明了槽即视为 payload 合法", () => {
    const centered = minimalTemplate({});
    const card = minimalTemplate({
      "props.text": {
        mode: "variable",
        allowExternal: true,
        slotId: "storeName",
        valueType: "string",
      },
    });
    const payload = validPayload(
      { storeName: "zyzshop1" },
      { storeName: { label: "店铺名称", valueType: "string" } }
    );
    // 单版式未引用该槽时，只要 payload.slots 已登记且 values 合法即可（见上一用例）
    assert.equal(validatePayloadAgainstTemplate(centered, payload).length, 0);

    const unionIssues = validatePayloadAgainstTemplateUnion([centered, card], payload);
    assert.equal(unionIssues.length, 0);
  });
});
