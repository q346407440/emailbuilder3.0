import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { isThemeRef } from "../types/themeRef";
import { insertCatalogBlockIntoTemplate, listInsertableCatalogEntries } from "./templateBlockInsert";
import { validateTemplateBindings } from "./validate";

function hasThemeRefDeep(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some(hasThemeRefDeep);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasThemeRefDeep);
  }
  return false;
}

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
        children: ["txt"],
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
          textBody: { paragraphs: [{ runs: [{ text: "hi" }] }] },
          fontSize: "14px",
          color: "#111111",
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {},
      },
    },
  };
}

describe("templateBlockInsert", () => {
  const textEntry = listInsertableCatalogEntries().find((entry) => entry.runtimeType === "text");
  if (!textEntry) throw new Error("缺少 text 组件定义");

  it("支持向容器插入子级", () => {
    const start = baseTemplate();
    const { template, insertedBlockId } = insertCatalogBlockIntoTemplate({
      template: start,
      selectedBlockId: "row",
      mode: "child",
      entry: textEntry,
    });
    assert.ok(template.blocks[insertedBlockId]);
    assert.equal(template.blocks[insertedBlockId]?.parentId, "row");
    assert.equal(template.blocks.row?.children.at(-1), insertedBlockId);
  });

  it("支持在当前区块下方插入同级", () => {
    const start = baseTemplate();
    const { template, insertedBlockId } = insertCatalogBlockIntoTemplate({
      template: start,
      selectedBlockId: "txt",
      mode: "below",
      entry: textEntry,
    });
    assert.equal(template.blocks[insertedBlockId]?.parentId, "row");
    assert.deepEqual(template.blocks.row?.children, ["txt", insertedBlockId]);
  });

  it("插入按钮不产生 $themeRef 与 bindings 校验违例", () => {
    const buttonEntry = listInsertableCatalogEntries().find((e) => e.runtimeType === "button");
    if (!buttonEntry) throw new Error("缺少 button 组件定义");
    const { template, insertedBlockId } = insertCatalogBlockIntoTemplate({
      template: baseTemplate(),
      selectedBlockId: "row",
      mode: "child",
      entry: buttonEntry,
    });
    const block = template.blocks[insertedBlockId];
    assert.ok(block);
    assert.equal(hasThemeRefDeep(block), false);
    assert.deepEqual(block?.bindings, {});
    const themeIssues = validateTemplateBindings(template).filter((i) =>
      /未登记 mode:"theme"/.test(i.reason)
    );
    assert.equal(themeIssues.length, 0);
  });
});

