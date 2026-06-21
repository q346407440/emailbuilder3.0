import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRepeatPreviewModel } from "../repeat-runtime";
import {
  collectSelectedPreviewBlockIds,
  isPreviewRootBlockSelected,
} from "./canvasSelectionOverlay";
import type { EmailPayload, EmailTemplate } from "../types/email";

describe("canvasSelectionOverlay", () => {
  const template = {
    schemaVersion: "4.0.0",
    rootBlockId: "root",
    blocks: {
      root: { id: "root", type: "emailRoot", parentId: null, children: ["t1"] },
      t1: { id: "t1", type: "text", parentId: "root", children: [] },
    },
    blockMeta: {},
    bindings: {},
  } as EmailTemplate;
  const payload = { schemaVersion: "1.0.0", slots: {}, values: {} } as EmailPayload;
  const previewModel = buildRepeatPreviewModel(template, payload);

  it("collectSelectedPreviewBlockIds 返回物理块 id", () => {
    const refIndex = new Map<string, import("../repeat-binding-contract").VirtualBlockRef>();
    const visit = (node: (typeof previewModel)["root"]) => {
      refIndex.set(node.block.id, node.ref);
      for (const child of node.children) visit(child);
    };
    visit(previewModel.root);

    const ids = collectSelectedPreviewBlockIds({ kind: "physical", blockId: "t1" }, refIndex);
    assert.deepEqual(ids, ["physical:t1"]);
  });

  it("isPreviewRootBlockSelected 识别根选中", () => {
    const refIndex = new Map([["root", { kind: "physical" as const, blockId: "root" }]]);
    assert.equal(
      isPreviewRootBlockSelected({ kind: "physical", blockId: "root" }, "root", refIndex),
      true
    );
    assert.equal(
      isPreviewRootBlockSelected({ kind: "physical", blockId: "t1" }, "root", refIndex),
      false
    );
  });
});
