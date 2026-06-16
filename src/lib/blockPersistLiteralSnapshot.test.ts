import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailTemplate } from "../types/email";
import {
  applyPersistLiteralSnapshotToBlock,
  extractBlockPersistLiteralSnapshot,
} from "./blockPersistLiteralSnapshot";
import { extractBlockInsertPrototype } from "./extractBlockInsertPrototype";

function minimalTemplate(block: EmailBlock): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "layout",
        parentId: null,
        children: [block.id],
        wrapperStyle: {},
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        bindings: {},
      } as EmailBlock,
      [block.id]: block,
    },
    blockMeta: {
      root: { blockType: "layout.container", name: "根" },
      [block.id]: { blockType: "action.button", name: "按钮" },
    },
  };
}

describe("extractBlockPersistLiteralSnapshot", () => {
  it("与 extractBlockInsertPrototype 结果一致", () => {
    const block: EmailBlock = {
      id: "btn1",
      type: "button",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "hug",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: {
        text: "立即购买",
        link: "https://shop.example.com",
        buttonStyle: {
          widthMode: "hug",
          backgroundColor: "#ff0000",
          textColor: "#ffffff",
          fontSize: "16px",
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          borderRadius: { mode: "unified", radius: "8px" },
          bold: true,
          italic: false,
        },
      },
      bindings: {
        "props.text": {
          mode: "variable",
          slotId: "ctaLabel",
          allowExternal: true,
          fieldKind: "content",
        },
      },
    };
    const template = minimalTemplate(block);
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {
        ctaLabel: { slotId: "ctaLabel", label: "CTA", valueType: "string" as const },
      },
      values: { ctaLabel: "运营文案" },
    };
    const mergedBlock = {
      ...block,
      props: { ...block.props, text: "运营文案" },
    };
    const args = {
      template,
      payload,
      blockId: "btn1",
      mergedBlock,
    };
    const fromShared = extractBlockPersistLiteralSnapshot(args);
    const fromInsert = extractBlockInsertPrototype(args);
    assert.deepEqual(fromShared, fromInsert);
  });

  it("applyPersistLiteralSnapshotToBlock 清空 bindings", () => {
    const block: EmailBlock = {
      id: "t1",
      type: "text",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: {
        textBody: { paragraphs: [{ runs: [{ text: "你好" }] }] },
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: { "props.textBody": { mode: "variable", slotId: "x", fieldKind: "content" } },
    };
    const next = applyPersistLiteralSnapshotToBlock(block, {
      props: block.props as Record<string, unknown>,
      wrapperStyle: block.wrapperStyle as Record<string, unknown>,
    });
    assert.deepEqual(next.bindings, {});
    assert.equal((next as { repeat?: unknown }).repeat, undefined);
  });
});
