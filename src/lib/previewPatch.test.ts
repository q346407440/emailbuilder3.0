import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePreviewInvalidation } from "../preview-invalidation-contract";
import { reuseFlatTemplateBlockReferences } from "./previewPatch";
import type { EmailTemplate } from "../types/email";

describe("preview-invalidation-contract", () => {
  it("blockField 为 subtree，structure 为 full", () => {
    assert.equal(computePreviewInvalidation("blockField").scope, "subtree");
    assert.equal(computePreviewInvalidation("structure").scope, "full");
    assert.equal(computePreviewInvalidation("laneA").scope, "full");
  });
});

describe("previewPatch reuseFlatTemplateBlockReferences", () => {
  it("未改 block 时复用 prev.blocks 引用", () => {
    const block = {
      id: "a",
      type: "text" as const,
      parentId: "root",
      children: [],
      props: { textBody: { paragraphs: [{ runs: [{ text: "hi" }] }] } },
    };
    const prev: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["a"],
          props: {},
        },
        a: block,
      },
    };
    const next: EmailTemplate = {
      ...prev,
      blocks: {
        root: { ...prev.blocks.root!, children: ["a"] },
        a: structuredClone(block),
      },
    };
    const merged = reuseFlatTemplateBlockReferences(prev, next);
    assert.equal(merged.blocks.a, prev.blocks.a);
  });

  it("改动的 block 使用新引用", () => {
    const prev: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["a", "b"],
          props: {},
        },
        a: {
          id: "a",
          type: "text",
          parentId: "root",
          children: [],
          props: { textBody: { paragraphs: [{ runs: [{ text: "1" }] }] } },
        },
        b: {
          id: "b",
          type: "text",
          parentId: "root",
          children: [],
          props: { textBody: { paragraphs: [{ runs: [{ text: "2" }] }] } },
        },
      },
    };
    const next: EmailTemplate = structuredClone(prev);
    next.blocks.b = {
      ...next.blocks.b!,
      props: { textBody: { paragraphs: [{ runs: [{ text: "changed" }] }] } },
    };
    const merged = reuseFlatTemplateBlockReferences(prev, next);
    assert.equal(merged.blocks.a, prev.blocks.a);
    assert.notEqual(merged.blocks.b, prev.blocks.b);
  });
});
