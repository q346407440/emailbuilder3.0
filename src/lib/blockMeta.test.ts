import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { applyBlockMetaName, blockDisplayName } from "./blockMeta";

describe("blockMeta", () => {
  const template = {
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "layout",
        parentId: null,
        children: ["t1"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: { direction: "vertical" },
        bindings: {},
      },
      t1: {
        id: "t1",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: { widthMode: "hug", heightMode: "hug" },
        props: {},
        bindings: {},
      },
    },
    blockMeta: {
      t1: { blockType: "content.text", name: "标题" },
    },
  } as unknown as EmailTemplate;

  it("blockDisplayName 优先 blockMeta.name", () => {
    assert.equal(blockDisplayName(template, "t1"), "标题");
    assert.equal(blockDisplayName(template, "missing"), "missing");
  });

  it("applyBlockMetaName 更新名称并保留 blockType", () => {
    const next = applyBlockMetaName(template, "t1", " 新名称 ");
    assert.equal(next.blockMeta?.t1?.name, "新名称");
    assert.equal(next.blockMeta?.t1?.blockType, "content.text");
  });
});
