import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { applyRepeatRegionBinding } from "./repeatRegion";
import {
  buildRepeatRegionTreeTagIndex,
  formatRepeatItemDisplayName,
  REPEAT_REGION_TREE_TAG_COLOR_COUNT,
  isRepeatItemCloneRoot,
  repeatTreeRowDisplayTag,
  repeatTreeTagForBlock,
  repeatTreeTagRoleLabel,
  stripRepeatItemDisplaySuffix,
} from "./repeatRegionTreeTags";

function templateWithHeadingAndList(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "tag-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "画布" },
      section: { blockType: "layout.container", name: "商品区" },
      heading: { blockType: "content.text", name: "区标题" },
      list: { blockType: "layout.container", name: "商品列表" },
      row: { blockType: "content.text", name: "商品行" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["section"],
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      section: {
        id: "section",
        type: "layout",
        parentId: "root",
        children: ["heading", "list"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      heading: {
        id: "heading",
        type: "text",
        parentId: "section",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "标题" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
          color: "#111",
          fontSize: "14px",
        },
      },
      list: {
        id: "list",
        type: "layout",
        parentId: "section",
        children: ["row"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
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
          textBody: { paragraphs: [{ runs: [{ text: "商品" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
          color: "#111",
          fontSize: "14px",
        },
      },
    },
  };
}

describe("repeatRegionTreeTags", () => {
  it("formatRepeatItemDisplayName 避免重复拼接第 N 项后缀", () => {
    assert.equal(formatRepeatItemDisplayName("商品行", 0), "商品行");
    assert.equal(formatRepeatItemDisplayName("商品行", 1), "商品行（第 2 项）");
    assert.equal(
      formatRepeatItemDisplayName("商品行（第 2 项）", 1),
      "商品行（第 2 项）"
    );
    assert.equal(stripRepeatItemDisplaySuffix("商品行（第 2 项）（第 2 项）"), "商品行");
  });

  it("标记宿主、行模板；展开后为克隆行打重复项 tag", () => {
    const bound = applyRepeatRegionBinding(templateWithHeadingAndList(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "名称", valueType: "string" }],
      label: "商品列表",
    });

    const diskIndex = buildRepeatRegionTreeTagIndex(bound);
    assert.equal(diskIndex.hosts.length, 1);
    assert.equal(diskIndex.byBlockId.get("list")?.role, "host");
    assert.equal(diskIndex.byBlockId.get("row")?.role, "prototype");
    assert.equal(diskIndex.byBlockId.get("heading"), undefined);
    assert.equal(repeatTreeTagRoleLabel("host"), "列表");
    assert.equal(diskIndex.byBlockId.get("list")?.colorIndex, 0);
  });

  it("多组 repeat 宿主分配不同 colorIndex（最多 10 色循环）", () => {
    const t = templateWithHeadingAndList();
    t.blocks.list2 = structuredClone(t.blocks.list);
    t.blocks.list2.id = "list2";
    t.blocks.list2.parentId = "section";
    t.blocks.row2 = structuredClone(t.blocks.row);
    t.blocks.row2.id = "row2";
    t.blocks.row2.parentId = "list2";
    t.blocks.list2.children = ["row2"];
    t.blocks.section.children = ["heading", "list", "list2"];

    const boundA = applyRepeatRegionBinding(t, "list", {
      slotId: "productsA",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "A", valueType: "string" }],
    });
    const boundB = applyRepeatRegionBinding(boundA, "list2", {
      slotId: "productsB",
      prototypeChildIds: ["row2"],
      itemFields: [{ key: "title", label: "B", valueType: "string" }],
    });

    const index = buildRepeatRegionTreeTagIndex(boundB);
    assert.equal(index.hosts.length, 2);
    assert.notEqual(
      index.byBlockId.get("list")?.colorIndex,
      index.byBlockId.get("list2")?.colorIndex
    );
    assert.ok(index.hosts.every((h) => h.colorIndex < REPEAT_REGION_TREE_TAG_COLOR_COUNT));
  });

  it("行模板子树内区块继承组色（repeatTreeTagForBlock）", () => {
    const bound = applyRepeatRegionBinding(templateWithHeadingAndList(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "名称", valueType: "string" }],
    });
    const index = buildRepeatRegionTreeTagIndex(bound);
    const inherited = repeatTreeTagForBlock(index, bound, "row");
    assert.equal(inherited?.role, "prototype");
  });

  it("repeatTreeRowDisplayTag：复制根第 1 项为列表，其余为重复；子树内块不展示 pill", () => {
    const bound = applyRepeatRegionBinding(templateWithHeadingAndList(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "名称", valueType: "string" }],
    });
    const index = buildRepeatRegionTreeTagIndex(bound);
    const hostTag = index.byBlockId.get("list")!;

    const row0: import("../repeat-binding-contract").VirtualBlockRef = {
      kind: "repeat-item",
      hostId: "list",
      prototypeRootId: "row",
      itemIndex: 0,
      contextStack: [],
    };
    const row1: import("../repeat-binding-contract").VirtualBlockRef = {
      ...row0,
      itemIndex: 1,
    };
    const row0Inner: import("../repeat-binding-contract").VirtualBlockRef = {
      kind: "repeat-item",
      hostId: "list",
      prototypeRootId: "heading",
      itemIndex: 0,
      contextStack: [],
    };

    assert.ok(isRepeatItemCloneRoot(row0, index));
    assert.ok(!isRepeatItemCloneRoot(row0Inner, index));

    const tag0 = repeatTreeRowDisplayTag(row0, { ...hostTag, role: "repeat-item", itemIndex: 0 }, index);
    const tag1 = repeatTreeRowDisplayTag(row1, { ...hostTag, role: "repeat-item", itemIndex: 1 }, index);
    assert.equal(tag0?.role, "host");
    assert.equal(repeatTreeTagRoleLabel(tag0!.role), "列表");
    assert.equal(tag1?.role, "repeat-item");
    assert.equal(repeatTreeTagRoleLabel(tag1!.role), "重复");
    assert.equal(
      repeatTreeRowDisplayTag(row0Inner, { ...hostTag, role: "repeat-item", itemIndex: 0 }, index),
      null
    );
  });
});
