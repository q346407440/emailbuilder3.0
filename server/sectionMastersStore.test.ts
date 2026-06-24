import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { isLogicallyDeleted } from "../src/lib/logicalDelete";
import { CATALOG_ROOT_ID } from "../src/lib/blockDefaults";
import type { SectionMaster } from "../src/types/master";
import {
  createSectionMaster,
  deleteSectionMaster,
  getSectionMaster,
  listSectionMasters,
} from "./sectionMastersStore";

function minimalSection(masterId: string, name: string): SectionMaster {
  return {
    masterId,
    name,
    version: new Date().toISOString(),
    rootBlockId: "__sec_root__",
    catalogRootBlockId: CATALOG_ROOT_ID,
    blocks: {
      [CATALOG_ROOT_ID]: {
        id: CATALOG_ROOT_ID,
        type: "emailRoot",
        parentId: null,
        children: ["__sec_root__"],
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
      __sec_root__: {
        id: "__sec_root__",
        type: "layout",
        parentId: CATALOG_ROOT_ID,
        children: ["__sec_placeholder_text__"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
          borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        bindings: {},
      },
      __sec_placeholder_text__: {
        id: "__sec_placeholder_text__",
        type: "text",
        parentId: "__sec_root__",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "占位" }] }] },
          fontSize: "14px",
          color: "#000000",
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {},
      },
    },
    blockMeta: {
      [CATALOG_ROOT_ID]: { blockType: "layout.container", name: "预览根" },
    },
  };
}

describe("sectionMastersStore 逻辑删除", () => {
  let tmpRoot = "";
  let prevEnv: string | undefined;

  before(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "section-masters-"));
    prevEnv = process.env.SECTION_MASTERS_ROOT;
    process.env.SECTION_MASTERS_ROOT = path.join(tmpRoot, "sections");
  });

  after(async () => {
    if (prevEnv === undefined) delete process.env.SECTION_MASTERS_ROOT;
    else process.env.SECTION_MASTERS_ROOT = prevEnv;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("delete 写入 deletedAt 且列表不再返回", async () => {
    const master = minimalSection("section.test-a", "模块 A");
    await createSectionMaster(tmpRoot, master);
    await deleteSectionMaster(tmpRoot, master.masterId);

    const listed = await listSectionMasters(tmpRoot);
    assert.equal(listed.length, 0);
    assert.equal(await getSectionMaster(tmpRoot, master.masterId), null);

    const filePath = path.join(process.env.SECTION_MASTERS_ROOT!, "section.test-a.json");
    const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as { deletedAt?: string };
    assert.ok(raw.deletedAt);
  });

  it("允许重复名称；id 冲突时拒绝新建", async () => {
    const a = minimalSection("section.test-b", "同名模块");
    const b = minimalSection("section.test-c", "同名模块");
    await createSectionMaster(tmpRoot, a);
    await createSectionMaster(tmpRoot, b);
    const listed = await listSectionMasters(tmpRoot);
    assert.equal(listed.length, 2);
    assert.equal(listed.filter((m) => m.name === "同名模块").length, 2);

    await assert.rejects(
      () => createSectionMaster(tmpRoot, minimalSection("section.test-b", "另一名称")),
      /已存在/
    );
  });

  it("已逻辑删除的 id 可再次创建新内容", async () => {
    const id = "section.test-d";
    const before = (await listSectionMasters(tmpRoot)).length;
    await createSectionMaster(tmpRoot, minimalSection(id, "旧模块"));
    await deleteSectionMaster(tmpRoot, id);
    const revived = minimalSection(id, "新模块");
    const saved = await createSectionMaster(tmpRoot, revived);
    assert.ok(!isLogicallyDeleted(saved));
    assert.equal((await listSectionMasters(tmpRoot)).length, before + 1);
    assert.equal((await getSectionMaster(tmpRoot, id))?.name, "新模块");
  });
});
