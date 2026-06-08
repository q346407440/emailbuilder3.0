import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LayoutManifest } from "../layout-variant-contract/types";
import { LAYOUT_MANIFEST_SCHEMA_VERSION } from "../layout-variant-contract/types";
import {
  listVisibleLayoutVariants,
  resolveEffectiveLayoutVariantId,
  softDeleteLayoutVariant,
} from "./layoutVariantLogicalDelete";

function sampleManifest(): LayoutManifest {
  return {
    schemaVersion: LAYOUT_MANIFEST_SCHEMA_VERSION,
    activeLayoutVariantId: "default",
    variants: [
      { id: "default", label: "默认", createdAt: "2026-01-01T00:00:00.000Z", publishStatus: "published" },
      { id: "alt", label: "备选", createdAt: "2026-01-02T00:00:00.000Z", publishStatus: "published" },
    ],
  };
}

describe("softDeleteLayoutVariant", () => {
  it("标记 deletedAt 并在删除 active 时切换 active", () => {
    const next = softDeleteLayoutVariant(sampleManifest(), "default");
    assert.equal(next.activeLayoutVariantId, "alt");
    const deleted = next.variants.find((v) => v.id === "default");
    assert.ok(deleted?.deletedAt);
    assert.equal(listVisibleLayoutVariants(next.variants).length, 1);
  });

  it("仅剩一个可见版式时拒绝删除", () => {
    const one = softDeleteLayoutVariant(sampleManifest(), "alt");
    assert.throws(() => softDeleteLayoutVariant(one, "default"), /至少保留/);
  });
});

describe("resolveEffectiveLayoutVariantId", () => {
  it("active 已删除时回落到可见版式", () => {
    const manifest = softDeleteLayoutVariant(sampleManifest(), "default");
    const { layoutVariantId, error } = resolveEffectiveLayoutVariantId(manifest);
    assert.equal(error, null);
    assert.equal(layoutVariantId, "alt");
  });
});
