import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PUBLISH_STATUS } from "../publish-status-contract";
import {
  buildClonedEmailSceneBundle,
  type CloneEmailSceneBundle,
  remapTemplateSceneEmailId,
} from "./cloneEmailScene";
import { buildBlankLayoutVariantAssets } from "./scaffoldNewEmail";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailMeta, EmailPayload } from "../types/email";

describe("remapTemplateSceneEmailId", () => {
  it("写入目标 emailKey", () => {
    const { template } = buildBlankLayoutVariantAssets("src-a", "default");
    const next = remapTemplateSceneEmailId(template, "dst-b");
    assert.equal(next.emailId, "dst-b");
    assert.equal(template.emailId, "src-a");
  });
});

describe("buildClonedEmailSceneBundle", () => {
  const manifest: LayoutManifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: "default",
    variants: [
      {
        id: "default",
        label: "默认",
        publishStatus: "published",
      },
      {
        id: "card",
        label: "卡片",
        publishStatus: "published",
        deletedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };

  const meta: EmailMeta = {
    schemaVersion: "1.0.0",
    displayName: "源模板",
    publishStatus: "published",
  };

  const payload: EmailPayload = {
    schemaVersion: "1.0.0",
    slots: { title: { valueType: "string" } },
    values: { title: "hello" },
  };

  it("仅复制未删除版式并重置发布状态", () => {
    const { template, tokenPresets } = buildBlankLayoutVariantAssets("source-key", "default");
    const built = buildClonedEmailSceneBundle({
      sourceEmailKey: "source-key",
      targetEmailKey: "new-key",
      displayName: "  新副本  ",
      meta,
      payload,
      manifest,
      layouts: [{ layoutVariantId: "default", template, tokenPresets }],
    });
    if ("error" in built) {
      assert.fail(built.error);
    }
    const bundle: CloneEmailSceneBundle = built;
    assert.equal(bundle.meta.displayName, "新副本");
    assert.equal(bundle.meta.publishStatus, DEFAULT_PUBLISH_STATUS);
    assert.equal(bundle.layoutManifest.variants.length, 1);
    assert.equal(bundle.layoutManifest.variants[0]!.publishStatus, DEFAULT_PUBLISH_STATUS);
    assert.equal(bundle.layoutAssets[0]!.template.emailId, "new-key");
    assert.deepEqual(bundle.payload.values, { title: "hello" });
  });
});
