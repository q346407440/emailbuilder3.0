import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { MINIMAL_TEXT_PROPS } from "./testFixtures/emailTemplate";
import { deleteBlockFromTemplate } from "./deleteTemplateBlock";

function baseTemplate(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "layout.container", name: "根" },
      row: { blockType: "layout.container", name: "行" },
      txt: { blockType: "content.text", name: "文案" },
      btn: { blockType: "action.button", name: "按钮" },
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
        children: ["txt", "btn"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
        bindings: {},
      },
      txt: {
        id: "txt",
        type: "text",
        parentId: "row",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          ...MINIMAL_TEXT_PROPS,
          textBody: { paragraphs: [{ runs: [{ text: "hi" }] }] },
        },
        bindings: {},
      },
      btn: {
        id: "btn",
        type: "button",
        parentId: "row",
        children: [],
        wrapperStyle: { widthMode: "hug", heightMode: "hug" },
        props: { text: "Go", link: "https://example.com" },
        bindings: {},
      },
    },
  };
}

describe("deleteBlockFromTemplate", () => {
  it("删除叶子区块并从父级 children 移除", () => {
    const next = deleteBlockFromTemplate(baseTemplate(), "btn");
    assert.equal(next.blocks.btn, undefined);
    assert.deepEqual(next.blocks.row?.children, ["txt"]);
  });

  it("不可删除根节点", () => {
    assert.throws(() => deleteBlockFromTemplate(baseTemplate(), "root"), /根节点/);
  });
});
