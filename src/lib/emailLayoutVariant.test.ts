import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  isLayoutManifestShape,
  resolveEmailFilePaths,
  resolveLayoutVariantId,
} from "./emailLayoutVariant.ts";
import type { LayoutManifest } from "../layout-variant-contract/types.ts";

const manifest: LayoutManifest = {
  schemaVersion: "1.0.0",
  activeLayoutVariantId: "card",
  variants: [
    { id: "card", label: "卡片分段" },
    { id: "centered", label: "居中流式" },
  ],
};

describe("emailLayoutVariant", () => {
  it("isLayoutManifestShape accepts valid manifest", () => {
    assert.equal(isLayoutManifestShape(manifest), true);
  });

  it("resolveLayoutVariantId uses active when query empty", () => {
    const r = resolveLayoutVariantId(manifest, undefined);
    assert.equal(r.error, null);
    assert.equal(r.layoutVariantId, "card");
  });

  it("resolveEmailFilePaths points under layouts/", () => {
    const base = "/data/emails/member-welcome";
    const ctx = resolveEmailFilePaths(base, manifest, "centered");
    assert.equal(ctx.mode, "layout-variants");
    assert.equal(
      ctx.templatePath,
      path.join(base, "layouts", "centered", "template.json")
    );
  });

  it("legacy mode uses root template.json", () => {
    const base = "/data/emails/other";
    const ctx = resolveEmailFilePaths(base, null, null);
    assert.equal(ctx.mode, "legacy");
    assert.equal(ctx.templatePath, path.join(base, "template.json"));
  });
});
