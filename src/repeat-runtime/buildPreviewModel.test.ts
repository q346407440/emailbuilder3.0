import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { applyRepeatRegionBinding } from "../lib/repeatRegion";
import { buildRepeatPreviewModel, previewModelToFlatTemplate, refToStableKey } from "./index";

function templateWithRepeatPrototype(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "repeat-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "画布" },
      list: { blockType: "layout.container", name: "商品列表" },
      row: { blockType: "content.text", name: "商品名称" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["list"],
        props: {
          backgroundColor: "#ffffff",
          pageInline: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        },
      },
      list: {
        id: "list",
        type: "layout",
        parentId: "root",
        children: ["row"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: { direction: "vertical" as const, gap: "8" },
      },
      row: {
        id: "row",
        type: "text",
        parentId: "list",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "占位" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
          color: "#111111",
          fontSize: "14px",
        },
      },
    },
  };
}

describe("buildRepeatPreviewModel", () => {
  it("collection repeat 展开为 repeat-item 虚拟行", () => {
    const bound = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: {
        products: [{ title: "第一件" }, { title: "第二件" }],
      },
    };

    const model = buildRepeatPreviewModel(bound, payload);
    const flat = previewModelToFlatTemplate(model, bound);
    const listKey = refToStableKey({ kind: "physical", blockId: "list" });
    const children = flat.blocks[listKey]!.children ?? [];
    assert.equal(children.length, 2);
    assert.match(children[0]!, /^repeat-item:list:row:0:/);
    assert.match(children[1]!, /^repeat-item:list:row:1:/);
  });

  it("分组 self-repeat 按组数展开当前宿主", () => {
    const bound = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["list"],
      itemMode: "group",
      groupSize: 2,
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: {
        products: [{ title: "第一件" }, { title: "第二件" }, { title: "第三件" }],
      },
    };

    const model = buildRepeatPreviewModel(bound, payload);
    const flat = previewModelToFlatTemplate(model, bound);
    const rootKey = refToStableKey({ kind: "physical", blockId: "root" });
    const children = flat.blocks[rootKey]!.children ?? [];
    assert.equal(children.length, 2);
    assert.match(children[0]!, /^repeat-item:list:list:0:/);
    assert.match(children[1]!, /^repeat-item:list:list:1:/);
  });

  it("分组 self-repeat 最后一组缺项时不显示旧模板占位", () => {
    const template = templateWithRepeatPrototype();
    template.blocks.list!.children = ["row", "row2"];
    const rowPrototype = template.blocks.row!;
    template.blocks.row2 = {
      ...structuredClone(rowPrototype),
      id: "row2",
      parentId: "list",
      props: {
        ...structuredClone(rowPrototype.props),
        textBody: { paragraphs: [{ runs: [{ text: "第二个占位" }] }] },
      },
    } as EmailBlock;
    const bound = applyRepeatRegionBinding(template, "list", {
      slotId: "products",
      prototypeChildIds: ["list"],
      itemMode: "group",
      groupSize: 2,
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      fieldMappings: [
        {
          id: "row.title",
          sourcePath: "title",
          targetBlockId: "row",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "商品名称",
          valueType: "string",
        },
        {
          id: "row2.title",
          sourcePath: "title",
          itemOffset: 1,
          targetBlockId: "row2",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "商品名称",
          valueType: "string",
        },
      ],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: {
        products: [{ title: "第一件" }, { title: "第二件" }, { title: "第三件" }],
      },
    };

    const model = buildRepeatPreviewModel(bound, payload);
    const flat = previewModelToFlatTemplate(model, bound);
    const rootKey = refToStableKey({ kind: "physical", blockId: "root" });
    const groups = flat.blocks[rootKey]!.children ?? [];
    assert.equal(groups.length, 2);
    assert.equal(flat.blocks[groups[0]!]!.children.length, 2);
    assert.equal(flat.blocks[groups[1]!]!.children.length, 1);
    const remainingTextId = flat.blocks[groups[1]!]!.children[0]!;
    const remainingText = flat.blocks[remainingTextId]!;
    assert.deepEqual(remainingText.props.textBody, {
      paragraphs: [{ runs: [{ text: "第三件" }] }],
    });
  });
});
