import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { applyRepeatRegionBinding } from "../lib/repeatRegion";
import { refToStableKey, refsEqual, resolvePhysicalBlockId, resolveRepeatContextForRef } from "./repeatVirtualResolver";

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
      fallback: { blockType: "content.text", name: "备用商品名称" },
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
        children: ["row", "fallback"],
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
      fallback: {
        id: "fallback",
        type: "text",
        parentId: "list",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "备用" }] }] },
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

function physicalRef(blockId: string) {
  return { kind: "physical" as const, blockId };
}

describe("repeatVirtualResolver", () => {
  it("refToStableKey：physical 与 repeat-item 键稳定", () => {
    assert.equal(refToStableKey(physicalRef("row")), "physical:row");
    assert.equal(
      refToStableKey({
        kind: "repeat-item",
        hostId: "list",
        prototypeRootId: "row",
        itemIndex: 1,
        contextStack: [{ slotId: "products", itemIndex: 0, item: {}, itemPath: "0" }],
      }),
      "repeat-item:list:row:1:products@0"
    );
  });

  it("refsEqual：同键视为相等", () => {
    assert.equal(refsEqual(physicalRef("a"), physicalRef("a")), true);
    assert.equal(refsEqual(physicalRef("a"), physicalRef("b")), false);
  });

  it("resolvePhysicalBlockId：repeat-item 取 prototypeRootId", () => {
    assert.equal(resolvePhysicalBlockId(physicalRef("row")), "row");
    assert.equal(
      resolvePhysicalBlockId({
        kind: "repeat-item",
        hostId: "list",
        prototypeRootId: "row",
        itemIndex: 0,
        contextStack: [],
      }),
      "row"
    );
  });

  it("resolveRepeatContextForRef：宿主自身为 host", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const ctx = resolveRepeatContextForRef(template, physicalRef("list"));
    assert.ok(ctx);
    assert.equal(ctx!.hostId, "list");
    assert.equal(ctx!.relation, "host");
  });

  it("resolveRepeatContextForRef：行模板内子孙为 row-template", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    assert.equal(resolveRepeatContextForRef(template, physicalRef("row"))?.relation, "row-template");
  });

  it("resolveRepeatContextForRef：有 fieldMappings 的区块为 mapped-field", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      fieldMappings: [
        {
          id: "map-1",
          sourcePath: "title",
          targetBlockId: "row",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
        },
      ],
    });
    const ctx = resolveRepeatContextForRef(template, physicalRef("row"));
    assert.equal(ctx?.relation, "mapped-field");
    assert.equal(ctx?.fieldMappingsOnBlock.length, 1);
  });

  it("resolveRepeatContextForRef：不在 repeat 行模板内返回 null", () => {
    const template = templateWithRepeatPrototype();
    assert.equal(resolveRepeatContextForRef(template, physicalRef("fallback")), null);
  });
});
