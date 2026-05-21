import assert from "node:assert";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import {
  flattenRepeatTargetFieldsForNav,
  repeatTargetGroupHasChildMapping,
} from "./repeatTargetFieldMappingTree";

function miniTemplate(): EmailTemplate {
  return {
    schemaVersion: "1.0.0",
    blocks: {
      row: {
        type: "layout",
        children: ["product", "skuSection"],
        bindings: {},
        props: {},
      },
      product: {
        type: "layout",
        children: ["productName", "productBadge"],
        bindings: {},
        props: {},
      },
      productName: {
        type: "text",
        children: [],
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "x",
            mode: "variable",
            allowExternal: true,
            valueType: "string",
          },
        },
        props: { textBody: { version: 1, paragraphs: [{ runs: [{ text: "" }] }] } },
      },
      productBadge: {
        type: "text",
        children: [],
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "x",
            mode: "variable",
            allowExternal: true,
            valueType: "string",
          },
        },
        props: { textBody: { version: 1, paragraphs: [{ runs: [{ text: "" }] }] } },
      },
      skuSection: {
        type: "layout",
        children: ["skuImage"],
        bindings: {},
        props: {},
      },
      skuImage: {
        type: "image",
        children: [],
        bindings: {},
        props: {},
      },
    },
    blockMeta: {
      row: { name: "行模板" },
      product: { name: "主推商品" },
      productName: { name: "主推商品名" },
      productBadge: { name: "主推商品角标" },
      skuSection: { name: "SKU 区" },
      skuImage: { name: "SKU 规格图" },
    },
    rootBlockId: "row",
  } as EmailTemplate;
}

describe("repeatTargetFieldMappingTree", () => {
  it("按区块树输出分组与缩进叶子", () => {
    const template = miniTemplate();
    const targets = [
      {
        key: "productName:props.textBody.paragraphs.0.runs.0.text",
        blockId: "productName",
        bindPath: "props.textBody.paragraphs.0.runs.0.text",
        label: "主推商品名 正文",
      },
      {
        key: "productBadge:props.textBody.paragraphs.0.runs.0.text",
        blockId: "productBadge",
        bindPath: "props.textBody.paragraphs.0.runs.0.text",
        label: "主推商品角标 正文",
      },
      {
        key: "skuImage:wrapperStyle.backgroundImage.src",
        blockId: "skuImage",
        bindPath: "wrapperStyle.backgroundImage.src",
        label: "SKU 规格图 图片地址",
      },
      {
        key: "skuImage:wrapperStyle.backgroundImage.alt",
        blockId: "skuImage",
        bindPath: "wrapperStyle.backgroundImage.alt",
        label: "SKU 规格图 替代文本",
      },
    ];
    const entries = flattenRepeatTargetFieldsForNav(template, ["row"], targets);
    assert.ok(!entries.some((e) => e.kind === "group" && e.label === "行模板"));
    assert.ok(entries.some((e) => e.kind === "group" && e.label === "主推商品"));
    assert.ok(entries.some((e) => e.kind === "group" && e.label === "SKU 区"));
    const topDepth = Math.min(...entries.map((e) => e.depth));
    assert.equal(topDepth, 0);
    assert.ok(entries.some((e) => e.kind === "group" && e.label === "SKU 规格图"));
    const skuGroup = entries.find((e) => e.kind === "group" && e.label === "SKU 规格图");
    const skuSrc = entries.find(
      (e) => e.kind === "leaf" && e.key === "skuImage:wrapperStyle.backgroundImage.src"
    );
    assert.ok(skuGroup && skuSrc);
    assert.equal(skuSrc.depth, skuGroup.depth + 1);
    assert.equal(
      repeatTargetGroupHasChildMapping(skuGroup.key, entries, {
        [skuSrc.key]: "imageSrc",
      }),
      true
    );
  });

  it("行模板根无子区块时仍展示根下可映射字段", () => {
    const template = miniTemplate();
    const targets = [
      {
        key: "skuImage:wrapperStyle.backgroundImage.src",
        blockId: "skuImage",
        bindPath: "wrapperStyle.backgroundImage.src",
        label: "图",
      },
    ];
    const entries = flattenRepeatTargetFieldsForNav(template, ["skuImage"], targets);
    assert.ok(entries.some((e) => e.kind === "leaf" && e.key === targets[0]!.key));
  });
});
