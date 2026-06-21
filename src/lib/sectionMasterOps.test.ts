import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_ROOT_ID } from "./blockDefaults";
import {
  deriveNewSectionMasterId,
  deriveSectionMasterIdFromName,
  extractSectionFromTemplate,
  insertSectionIntoTemplate,
} from "./sectionMasterOps";
import { BLOCK_CATALOG_ENTRIES } from "./blockDefaults";
import { insertCatalogBlockIntoTemplate } from "./templateBlockInsert";
import type { EmailTemplate } from "../types/email";

describe("deriveNewSectionMasterId", () => {
  it("生成 section.m 前缀 id，与名称无关", () => {
    const a = deriveNewSectionMasterId([]);
    const b = deriveNewSectionMasterId([a]);
    assert.ok(a.startsWith("section.m"));
    assert.ok(b.startsWith("section.m"));
    assert.notEqual(a, b);
    const sameNameA = deriveSectionMasterIdFromName("行动区", []);
    const sameNameB = deriveSectionMasterIdFromName("行动区", [sameNameA]);
    assert.notEqual(sameNameA, sameNameB);
  });
});

describe("section extract + insert", () => {
  it("保存并插入模块子树", () => {
    const layoutEntry = BLOCK_CATALOG_ENTRIES.find((e) => e.runtimeType === "layout");
    assert.ok(layoutEntry);
    let template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t1",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: [],
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          props: {
            backgroundColor: "#fff",
            width: "600px",
            padding: { top: "0", right: "0", bottom: "0", left: "0" },
            border: { style: "solid", color: "#000", top: "0", right: "0", bottom: "0", left: "0" },
            gapMode: "fixed",
            gap: "0",
          },
          bindings: {},
        },
      },
      blockMeta: {},
    };

    const inserted = insertCatalogBlockIntoTemplate({
      template,
      selectedBlockId: "root",
      mode: "child",
      entry: layoutEntry!,
    });
    template = inserted.template;
    const layoutId = inserted.insertedBlockId;

    const textEntry = BLOCK_CATALOG_ENTRIES.find((e) => e.runtimeType === "text");
    assert.ok(textEntry);
    template = insertCatalogBlockIntoTemplate({
      template,
      selectedBlockId: layoutId,
      mode: "child",
      entry: textEntry!,
    }).template;

    const emptyPayload = { schemaVersion: "1.0.0" as const, slots: {}, values: {} };
    const section = extractSectionFromTemplate({
      template,
      payload: emptyPayload,
      rootBlockId: layoutId,
      masterId: "section.test",
      name: "测试模块",
    });
    assert.ok(section.blocks[section.rootBlockId]);
    assert.ok(section.blocks[CATALOG_ROOT_ID]);

    const empty = {
      ...template,
      blocks: {
        root: { ...template.blocks.root!, children: [] as string[] },
      },
    };
    const afterInsert = insertSectionIntoTemplate({
      template: empty,
      selectedBlockId: "root",
      mode: "child",
      section,
    });
    assert.equal(afterInsert.template.blocks.root!.children.length, 1);
    assert.ok(afterInsert.template.blocks[afterInsert.insertedBlockId]);
    assert.ok(
      (afterInsert.template.blocks[afterInsert.insertedBlockId]?.children?.length ?? 0) >= 1
    );
  });
});
