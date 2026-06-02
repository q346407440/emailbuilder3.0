import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { buildRepeatPreviewModel, previewModelToFlatTemplate, refToStableKey } from "../repeat-runtime";
import {
  applySingleLevelRepeatBinding,
  listNestedCollectionFields,
  removeUnifiedRepeatBinding,
} from "./repeatNestedBinding";
import { validateTemplate } from "./validate";
import { parseTemplateFromDisk } from "./templateTreeAdapter";

function miniNestedTemplate(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "nested-repeat-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "根" },
      outer: { blockType: "layout.container", name: "外层" },
      row: { blockType: "layout.container", name: "父级行" },
      inner: { blockType: "layout.container", name: "子级条带" },
      leaf: { blockType: "content.text", name: "子级文案" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["outer"],
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      outer: {
        id: "outer",
        type: "layout",
        parentId: "root",
        children: ["row"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      row: {
        id: "row",
        type: "layout",
        parentId: "outer",
        children: ["inner"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      inner: {
        id: "inner",
        type: "layout",
        parentId: "row",
        children: ["leaf"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      leaf: {
        id: "leaf",
        type: "text",
        parentId: "inner",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
        },
      },
    },
  } as unknown as EmailTemplate;
}

const parentItemFields = [
  { key: "title", label: "标题", valueType: "string" as const, required: true },
  {
    key: "lines",
    label: "子行",
    valueType: "collection" as const,
    itemFields: [{ key: "title", label: "子标题", valueType: "string" as const, required: true }],
    minItems: 0,
    maxItems: 3,
  },
];

const lineItemFields = [{ key: "title", label: "子标题", valueType: "string" as const, required: true }];

const payload: EmailPayload = {
  schemaVersion: "1.0.0",
  slots: {},
  values: {
    items: [
      { title: "A", lines: [{ title: "A1" }, { title: "A2" }] },
      { title: "B", lines: [{ title: "B1" }] },
    ],
  },
};

describe("repeatNestedBinding（单层模型）", () => {
  it("listNestedCollectionFields 列出子列表列", () => {
    const nested = listNestedCollectionFields(parentItemFields);
    assert.deepEqual(nested.map((f) => f.path), ["lines"]);
    assert.equal(nested[0]!.itemFields.length, 1);
  });

  it("applySingleLevelRepeatBinding 顶层变量：宿主自复制（prototypeChildIds=[self]，无 itemPath）", () => {
    const bound = applySingleLevelRepeatBinding(
      miniNestedTemplate(),
      { hostId: "row", slotId: "items", itemFields: parentItemFields, fieldMappings: [] },
      payload
    );
    assert.deepEqual(bound.blocks.row?.repeat?.prototypeChildIds, ["row"]);
    assert.deepEqual(bound.blocks.row?.repeat?.fallbackChildIds, ["row"]);
    assert.equal(bound.blocks.row?.repeat?.itemPath, undefined);
  });

  it("applySingleLevelRepeatBinding 父项子列表：写 itemPath、宿主自复制", () => {
    const bound = applySingleLevelRepeatBinding(
      miniNestedTemplate(),
      { hostId: "inner", slotId: "items", itemPath: "lines", itemFields: lineItemFields, fieldMappings: [] },
      payload
    );
    assert.equal(bound.blocks.inner?.repeat?.itemPath, "lines");
    assert.deepEqual(bound.blocks.inner?.repeat?.prototypeChildIds, ["inner"]);
  });

  it("applySingleLevelRepeatBinding 重绑父级不清除已有的独立子级 repeat（决策 A）", () => {
    let t = applySingleLevelRepeatBinding(
      miniNestedTemplate(),
      { hostId: "inner", slotId: "items", itemPath: "lines", itemFields: lineItemFields, fieldMappings: [] },
      payload
    );
    t = applySingleLevelRepeatBinding(
      t,
      { hostId: "row", slotId: "items", itemFields: parentItemFields, fieldMappings: [] },
      payload
    );
    // 子级 inner 的 itemPath repeat 应被保留
    assert.equal(t.blocks.inner?.repeat?.itemPath, "lines");
    assert.deepEqual(t.blocks.row?.repeat?.prototypeChildIds, ["row"]);
  });

  it("嵌套 self-repeat 展开：父 2 行、子按各自 lines 展开", () => {
    let t = applySingleLevelRepeatBinding(
      miniNestedTemplate(),
      { hostId: "row", slotId: "items", itemFields: parentItemFields, fieldMappings: [] },
      payload
    );
    t = applySingleLevelRepeatBinding(
      t,
      { hostId: "inner", slotId: "items", itemPath: "lines", itemFields: lineItemFields, fieldMappings: [] },
      payload
    );
    const model = buildRepeatPreviewModel(t, payload);
    const flat = previewModelToFlatTemplate(model, t);
    const outerKey = refToStableKey({ kind: "physical", blockId: "outer" });
    const rowClones = flat.blocks[outerKey]?.children?.filter((id) => id.startsWith("repeat-item:row:")) ?? [];
    assert.equal(rowClones.length, 2);
    const innerCounts = rowClones.map((rid) =>
      (flat.blocks[rid]?.children ?? []).filter((id) => id.includes("repeat-item:inner:")).length
    );
    assert.deepEqual(innerCounts, [2, 1]);
  });

  it("removeUnifiedRepeatBinding materializeRows：self-repeat 物化为多行且无悬空引用", () => {
    const bound = applySingleLevelRepeatBinding(
      miniNestedTemplate(),
      { hostId: "row", slotId: "items", itemFields: parentItemFields, fieldMappings: [] },
      payload
    );
    const unbound = removeUnifiedRepeatBinding(bound, "row", payload, { mode: "materializeRows" });
    assert.ok(unbound.blocks.row);
    assert.equal(unbound.blocks.row?.repeat, undefined);
    assert.ok(unbound.blocks["row-2"]);
    assert.deepEqual(unbound.blocks.outer?.children, ["row", "row-2"]);
    // 不应有悬空子节点引用
    for (const [, block] of Object.entries(unbound.blocks)) {
      for (const childId of block.children ?? []) {
        assert.ok(unbound.blocks[childId], `悬空子节点 ${childId}`);
      }
    }
  });

  it("removeUnifiedRepeatBinding keepPrototypeOnly：仅留行模板、清子树 repeat", () => {
    let t = applySingleLevelRepeatBinding(
      miniNestedTemplate(),
      { hostId: "inner", slotId: "items", itemPath: "lines", itemFields: lineItemFields, fieldMappings: [] },
      payload
    );
    t = applySingleLevelRepeatBinding(
      t,
      { hostId: "row", slotId: "items", itemFields: parentItemFields, fieldMappings: [] },
      payload
    );
    const unbound = removeUnifiedRepeatBinding(t, "row", payload, { mode: "keepPrototypeOnly" });
    assert.equal(unbound.blocks.row?.repeat, undefined);
    assert.equal(unbound.blocks.inner?.repeat, undefined);
  });

  it("removeUnifiedRepeatBinding 解绑主推 SPU(self-repeat)物化后子树无 collection 硬错误", () => {
    const template = parseTemplateFromDisk(
      JSON.parse(
        readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
      )
    );
    const pl = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;
    const unbound = removeUnifiedRepeatBinding(template, "rfj-picked-spotlight-cell", pl);
    const hard = validateTemplate(unbound)
      .filter((i) => i.path.includes("rfj-picked-spotlight"))
      .filter((i) => !i.level);
    assert.deepEqual(
      hard.map((i) => `${i.path}: ${i.reason}`),
      [],
      hard.map((i) => `${i.path}: ${i.reason}`).join("\n")
    );
  });

  it("removeUnifiedRepeatBinding 解绑主推 SPU 后子树内无残留 repeat", () => {
    const template = parseTemplateFromDisk(
      JSON.parse(
        readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
      )
    );
    const pl = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;
    const unbound = removeUnifiedRepeatBinding(template, "rfj-picked-spotlight-cell", pl);
    const subtreeRepeatIds = Object.keys(unbound.blocks).filter(
      (id) => id.startsWith("rfj-picked-spotlight") && Boolean(unbound.blocks[id]?.repeat)
    );
    assert.deepEqual(subtreeRepeatIds, []);
  });
});
