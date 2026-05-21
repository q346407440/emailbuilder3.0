import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EmailTemplate } from "../types/email";
import {
  applyRepeatListItemFieldKey,
  filterRepeatItemFieldsForBindPath,
  formatCollectionFirstItemFieldExample,
  formatCollectionSlotListSummary,
  resolveRepeatListItemFieldBinding,
} from "./repeatListItemField";

const TEXT_RUN_BIND = "props.textBody.paragraphs.0.runs.0.text";

function textProps(text: string) {
  return {
    textBody: { version: 1 as const, paragraphs: [{ runs: [{ text }] }] },
    bold: false,
    italic: false,
    decoration: "none" as const,
  };
}

function tpl(blocks: EmailTemplate["blocks"]): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    emailId: "t",
    templateId: "t",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: "root",
    blocks,
  };
}

describe("repeatListItemField", () => {
  it("resolveRepeatListItemFieldBinding：行模板内 collection 字段", () => {
    const template = tpl({
      host: {
        id: "host",
        type: "layout",
        parentId: "root",
        children: ["row"],
        repeat: {
          mode: "collection",
          slotId: "items",
          prototypeChildIds: ["row"],
          fallbackChildIds: ["row"],
          itemFields: [
            { key: "title", label: "标题", valueType: "string", required: true },
            { key: "iconSrc", label: "图标", valueType: "image", required: true },
          ],
        },
        wrapperStyle: {},
        props: { direction: "vertical" },
      },
      row: {
        id: "row",
        type: "text",
        parentId: "host",
        children: [],
        wrapperStyle: {},
        props: textProps("x"),
        bindings: {
          [TEXT_RUN_BIND]: {
            slotId: "items",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            fieldKind: "content",
            slotPath: "0.title",
            itemFields: [{ key: "title", label: "标题", valueType: "string", required: true }],
          },
        },
      },
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["host"],
        props: { width: "600px" },
      },
    });

    const ctx = resolveRepeatListItemFieldBinding(template, "row", TEXT_RUN_BIND);
    assert.ok(ctx);
    assert.equal(ctx.itemFieldKey, "title");
    assert.equal(ctx.relation, "row-template");
  });

  it("applyRepeatListItemFieldKey 改写 slotPath 项字段", () => {
    const template = tpl({
      host: {
        id: "host",
        type: "layout",
        parentId: "root",
        children: ["row"],
        repeat: {
          mode: "collection",
          slotId: "items",
          prototypeChildIds: ["row"],
          fallbackChildIds: ["row"],
          itemFields: [
            { key: "title", label: "标题", valueType: "string", required: true },
            { key: "subtitle", label: "说明", valueType: "string", required: true },
          ],
        },
        wrapperStyle: {},
        props: { direction: "vertical" },
      },
      row: {
        id: "row",
        type: "text",
        parentId: "host",
        children: [],
        wrapperStyle: {},
        props: textProps("x"),
        bindings: {
          [TEXT_RUN_BIND]: {
            slotId: "items",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            fieldKind: "content",
            slotPath: "0.title",
          },
        },
      },
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["host"],
        props: { width: "600px" },
      },
    });

    const next = applyRepeatListItemFieldKey(template, "row", TEXT_RUN_BIND, "subtitle");
    assert.equal(next.blocks.row.bindings?.[TEXT_RUN_BIND].slotPath, "0.subtitle");
  });

  it("formatCollectionSlotListSummary 展示项数与首项预览", () => {
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {},
      values: {
        memberBenefits: [{ title: "Get points" }, { title: "Other" }],
      },
    };
    const fields = [{ key: "title", label: "标题", valueType: "string" as const, required: true }];
    assert.equal(formatCollectionSlotListSummary(payload, "memberBenefits", fields), "2 项 · Get points");
    assert.equal(formatCollectionSlotListSummary(payload, "empty", fields), "—");
  });

  it("formatCollectionFirstItemFieldExample 读取列表第 1 项字段", () => {
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {},
      values: {
        memberBenefits: [
          { title: "Get points", subtitle: "Reward 888 points" },
          { title: "Other", subtitle: "Other sub" },
        ],
      },
    };
    assert.equal(
      formatCollectionFirstItemFieldExample(payload, "memberBenefits", "subtitle"),
      "Reward 888 points"
    );
  });

  it("filterRepeatItemFieldsForBindPath 按路径筛选 image 字段", () => {
    const fields = [
      { key: "title", label: "标题", valueType: "string" as const, required: true },
      { key: "iconSrc", label: "图标", valueType: "image" as const, required: true },
    ];
    const imageOnly = filterRepeatItemFieldsForBindPath(fields, "props.src");
    assert.equal(imageOnly.length, 1);
    assert.equal(imageOnly[0]?.key, "iconSrc");
  });
});
