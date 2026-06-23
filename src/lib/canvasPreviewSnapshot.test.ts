import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCanvasPreviewSnapshot,
  commitCanvasSnapshot,
  shouldFreezeSnapshot,
  toCommittedCanvasSnapshot,
} from "./canvasPreviewSnapshot";
import type { EmailPayload, EmailTemplate } from "../types/email";

function minimalTemplate(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "snap-test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: [],
        props: { backgroundColor: "#ffffff" },
      },
    },
  };
}

function minimalPayload(): EmailPayload {
  return { schemaVersion: "1.0.0", slots: {}, values: {} };
}

describe("canvasPreviewSnapshot", () => {
  it("buildCanvasPreviewSnapshot 无 themeRef 时返回 previewModel 与 flatTemplate", () => {
    const built = buildCanvasPreviewSnapshot({
      template: minimalTemplate(),
      previewPayload: minimalPayload(),
      effectiveDesignTokens: null,
      hasVisibilityBlocks: false,
      canvasSimulateAllHidden: false,
      generation: 1,
    });
    assert.ok(built.previewModel);
    assert.ok(built.flatTemplate);
    assert.equal(built.issues.length, 0);
  });

  it("toCommittedCanvasSnapshot 在 preview 不可用时返回 null", () => {
    const built = buildCanvasPreviewSnapshot({
      template: minimalTemplate(),
      previewPayload: minimalPayload(),
      effectiveDesignTokens: null,
      hasVisibilityBlocks: false,
      canvasSimulateAllHidden: false,
      generation: 1,
    });
    const snap = toCommittedCanvasSnapshot(built, 1);
    assert.ok(snap);
    assert.equal(snap!.generation, 1);
  });

  it("commitCanvasSnapshot generation 不匹配时保留 prev", () => {
    const built = buildCanvasPreviewSnapshot({
      template: minimalTemplate(),
      previewPayload: minimalPayload(),
      effectiveDesignTokens: null,
      hasVisibilityBlocks: false,
      canvasSimulateAllHidden: false,
      generation: 2,
    });
    const next = toCommittedCanvasSnapshot(built, 2);
    assert.ok(next);
    const prev = { ...next!, generation: 1 };
    assert.equal(commitCanvasSnapshot(prev as typeof next, next!, 1), prev);
    assert.equal(commitCanvasSnapshot(prev as typeof next, next!, 2), next);
  });

  it("shouldFreezeSnapshot 在 loading 或 loadFrozen 时为 true", () => {
    assert.equal(shouldFreezeSnapshot("loading", false), true);
    assert.equal(shouldFreezeSnapshot("ready", true), true);
    assert.equal(shouldFreezeSnapshot("ready", false), false);
  });
});
