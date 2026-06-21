import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { MINIMAL_TEXT_PROPS } from "./testFixtures/emailTemplate";
import {
  duplicateBlockBelow,
  getBlockSiblingMoveState,
  moveBlockAmongSiblings,
  moveBlockToParentIndex,
} from "./templateBlockSiblingOps";

function baseTemplate(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "layout.container", name: "根" },
      row: { blockType: "layout.container", name: "行" },
      a: { blockType: "content.text", name: "A" },
      b: { blockType: "content.text", name: "B" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["row"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          width: "600px",
          backgroundColor: "#fff",
          padding: { top: "0", right: "0", bottom: "0", left: "0" },
          border: { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      row: {
        id: "row",
        type: "layout",
        parentId: "root",
        children: ["a", "b"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
        bindings: {},
      },
      a: {
        id: "a",
        type: "text",
        parentId: "row",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          ...MINIMAL_TEXT_PROPS,
          textBody: { paragraphs: [{ runs: [{ text: "A" }] }] },
        },
        bindings: {
          "props.color": {
            slotId: "colors.primary",
            mode: "theme",
            tokenPath: "colors.primary",
            fieldKind: "style",
          },
        },
      },
      b: {
        id: "b",
        type: "text",
        parentId: "row",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          ...MINIMAL_TEXT_PROPS,
          textBody: { paragraphs: [{ runs: [{ text: "B" }] }] },
        },
        bindings: {},
      },
    },
  };
}

describe("templateBlockSiblingOps", () => {
  it("同级移动状态：首尾不可再移", () => {
    assert.deepEqual(getBlockSiblingMoveState(baseTemplate(), "a"), {
      parentId: "row",
      index: 0,
      canMoveUp: false,
      canMoveDown: true,
    });
    assert.deepEqual(getBlockSiblingMoveState(baseTemplate(), "b"), {
      parentId: "row",
      index: 1,
      canMoveUp: true,
      canMoveDown: false,
    });
  });

  it("下移后 children 顺序交换", () => {
    const next = moveBlockAmongSiblings(baseTemplate(), "a", "down");
    assert.deepEqual(next.blocks.row?.children, ["b", "a"]);
  });

  it("moveBlockToParentIndex：可跨父级移动", () => {
    const start = baseTemplate();
    const next = moveBlockToParentIndex(start, "b", "root", 1);
    assert.deepEqual(next.blocks.row?.children, ["a"]);
    assert.deepEqual(next.blocks.root?.children, ["row", "b"]);
    assert.equal(next.blocks.b?.parentId, "root");
  });

  it("moveBlockToParentIndex：同父级换位", () => {
    const next = moveBlockToParentIndex(baseTemplate(), "a", "row", 2);
    assert.deepEqual(next.blocks.row?.children, ["b", "a"]);
  });

  it("复制含子树与 bindings，插入到原块下方", () => {
    const start = baseTemplate();
    const { template, duplicatedRootId } = duplicateBlockBelow(start, "a");
    assert.notEqual(duplicatedRootId, "a");
    assert.ok(template.blocks[duplicatedRootId]);
    assert.deepEqual(template.blocks.row?.children, ["a", duplicatedRootId, "b"]);
    assert.deepEqual(template.blocks[duplicatedRootId]?.bindings, start.blocks.a?.bindings);
    assert.equal(template.blockMeta?.[duplicatedRootId]?.name, start.blockMeta?.a?.name);
  });
});
