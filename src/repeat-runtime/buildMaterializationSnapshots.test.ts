import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { applyRepeatRegionBinding } from "../lib/repeatRegion";
import { buildRepeatItemMaterializationSnapshots } from "./buildMaterializationSnapshots";

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

describe("buildRepeatItemMaterializationSnapshots", () => {
  it("按 itemIndex 逐行产出 snapshot，第二项 root id 为 row-2", () => {
    const bound = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: {
        products: [{ title: "A" }, { title: "B" }],
      },
    };

    const snapshots = buildRepeatItemMaterializationSnapshots(bound, payload, "list");
    assert.equal(snapshots.length, 2);
    // snapshot 在原型 id 空间；row-2 在 materializeRepeatSnapshotsToTemplate 落盘时生成
    assert.deepEqual(snapshots[0]!.rootBlockIds, ["row"]);
    assert.deepEqual(snapshots[1]!.rootBlockIds, ["row"]);
    assert.equal(snapshots[1]!.itemIndex, 1);
    assert.equal(snapshots[0]!.blocks.row?.type, "text");
    assert.equal(snapshots[1]!.blocks.row?.type, "text");
    assert.equal("repeat" in (snapshots[0]!.blocks.row ?? {}), false);
  });
});
