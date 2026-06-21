import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { applyRepeatRegionBinding } from "./repeatRegion";
import { buildRepeatPreviewModel } from "../repeat-runtime";
import { refToStableKey } from "../repeat-runtime/repeatVirtualResolver";
import {
  canShowCanvasDropSlotAtPreviewIndex,
  canShowCanvasDropSlotForMove,
  findPreviewNodeByBlockId,
  listPreviewInsertSlotTargets,
  resolvePhysicalInsertFromPreviewSlot,
} from "./canvasDragInsert";
import { BLOCK_CATALOG_ENTRIES } from "./blockDefaults";
import { insertDraggedBlockAtPreviewSlot } from "./canvasDragInsert";

function templateWithRepeatPrototype(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "repeat-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "画布" },
      list: { blockType: "layout.container", name: "商品列表" },
      row: { blockType: "layout.container", name: "行" },
      txt: { blockType: "content.text", name: "商品名称" },
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
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
        bindings: {},
      },
      row: {
        id: "row",
        type: "layout",
        parentId: "list",
        children: ["txt"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gapMode: "fixed", gap: "4px" },
        bindings: {},
      },
      txt: {
        id: "txt",
        type: "text",
        parentId: "row",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { textBody: { format: "plain", plain: "示例" } },
      },
    },
  };
}

const payload: EmailPayload = {
  schemaVersion: "1.0.0",
  slots: {},
  values: {
    products: [{ title: "A" }, { title: "B" }],
  },
};

function bindListRepeat(template: EmailTemplate): EmailTemplate {
  return applyRepeatRegionBinding(template, "list", {
    slotId: "products",
    prototypeChildIds: ["row"],
    itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    fieldMappings: [
      {
        id: "txt.title",
        sourcePath: "title",
        targetBlockId: "txt",
        targetBindPath: "props.textBody.plain",
        label: "商品名称",
        valueType: "string",
      },
    ],
  });
}

describe("canvasDragInsert", () => {
  it("repeat 展开项内父级可解析物理插入点", () => {
    const template = bindListRepeat(templateWithRepeatPrototype());

    const previewModel = buildRepeatPreviewModel(template, payload);
    const listNode = findPreviewNodeByBlockId(previewModel, refToStableKey({ kind: "physical", blockId: "list" }));
    assert.ok(listNode);
    assert.ok(listNode.children.length >= 2);

    const firstItem = listNode.children[0]!;
    assert.equal(firstItem.ref.kind, "repeat-item");
    const rowPreviewId = firstItem.block.id;
    const rowNode = findPreviewNodeByBlockId(previewModel, rowPreviewId);
    assert.ok(rowNode);

    const target = resolvePhysicalInsertFromPreviewSlot(template, previewModel, rowPreviewId, 0);
    assert.equal(target.parentId, "row");
    assert.equal(target.insertIndex, 0);
  });

  it("repeat 宿主相邻展开项之间不展示插入槽", () => {
    const template = bindListRepeat(templateWithRepeatPrototype());
    const previewModel = buildRepeatPreviewModel(template, payload);
    const listPreviewId = refToStableKey({ kind: "physical", blockId: "list" });
    const listNode = findPreviewNodeByBlockId(previewModel, listPreviewId)!;

    const slots = listPreviewInsertSlotTargets(template, listNode);
    assert.equal(slots[1], null);
    assert.ok(slots[0]);
    assert.ok(slots[2]);
  });

  it("拖入 repeat 行容器可写入 prototype 子级", () => {
    const template = bindListRepeat(templateWithRepeatPrototype());
    const previewModel = buildRepeatPreviewModel(template, payload);
    const listNode = findPreviewNodeByBlockId(
      previewModel,
      refToStableKey({ kind: "physical", blockId: "list" })
    )!;
    const rowPreviewId = listNode.children[0]!.block.id;
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.masterId === "separator.divider")!;

    const { template: next, insertedBlockId } = insertDraggedBlockAtPreviewSlot({
      sourceTemplate: template,
      previewModel,
      parentPreviewBlockId: rowPreviewId,
      insertIndex: 0,
      entry,
    });

    assert.ok(next.blocks[insertedBlockId]);
    assert.equal(next.blocks[insertedBlockId]?.parentId, "row");
    assert.ok(next.blocks.row?.children.includes(insertedBlockId));
  });

  it("canShowCanvasDropSlotAtPreviewIndex 与槽位表一致", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const previewModel = buildRepeatPreviewModel(template, payload);
    const listPreviewId = refToStableKey({ kind: "physical", blockId: "list" });

    assert.equal(
      canShowCanvasDropSlotAtPreviewIndex(template, previewModel, listPreviewId, 1),
      false
    );
    assert.equal(
      canShowCanvasDropSlotAtPreviewIndex(template, previewModel, listPreviewId, 0),
      true
    );
  });

  it("canShowCanvasDropSlotForMove：原位与自身子树内不可落", () => {
    const template = templateWithRepeatPrototype();
    const previewModel = buildRepeatPreviewModel(template, payload);
    const rowPreviewId = refToStableKey({ kind: "physical", blockId: "row" });
    assert.equal(
      canShowCanvasDropSlotForMove(template, previewModel, "row", rowPreviewId, 0),
      false
    );
    assert.ok(
      canShowCanvasDropSlotForMove(
        template,
        previewModel,
        "txt",
        refToStableKey({ kind: "physical", blockId: "list" }),
        1
      )
    );
  });
});
