import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  appendLayoutManifestVariant,
  buildFixtureLayoutSlot,
  buildRestoreTestLayoutSlot,
  nextFixtureLayoutSequence,
  nextRestoreTestLayoutSequence,
} from "./restoreAstTestLayoutRun";
import type { LayoutManifest } from "../layout-variant-contract/types";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "restore-layout-run-"));
}

test("nextRestoreTestLayoutSequence 从 manifest 与 layouts 目录取最大序号", () => {
  const base = tempDir();
  const manifest: LayoutManifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: "default",
    variants: [
      { id: "default", label: "默认", publishStatus: "draft" },
      { id: "restore-run-2", label: "还原-2", publishStatus: "draft" },
    ],
  };
  fs.mkdirSync(path.join(base, "layouts", "restore-run-3"), { recursive: true });

  assert.equal(nextRestoreTestLayoutSequence(manifest, base, "还原"), 4);

  const slot = buildRestoreTestLayoutSlot(manifest, base, "还原");
  assert.equal(slot.layoutVariantId, "restore-run-4");
  assert.equal(slot.label, "还原-4");
});

test("nextFixtureLayoutSequence 按夹具名分别计数", () => {
  const base = tempDir();
  const manifest: LayoutManifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: "default",
    variants: [
      { id: "default", label: "默认", publishStatus: "draft" },
      { id: "forever21-template46-2", label: "forever21-template46-2", publishStatus: "draft" },
      { id: "huckberry-template48-1", label: "huckberry-template48-1", publishStatus: "draft" },
    ],
  };
  fs.mkdirSync(path.join(base, "layouts", "forever21-template46-3"), { recursive: true });

  assert.equal(nextFixtureLayoutSequence(manifest, base, "forever21-template46"), 4);
  assert.equal(nextFixtureLayoutSequence(manifest, base, "huckberry-template48"), 2);

  const slot = buildFixtureLayoutSlot(manifest, base, "huckberry-template48");
  assert.equal(slot.layoutVariantId, "huckberry-template48-2");
  assert.equal(slot.label, "huckberry-template48-2");
});

test("appendLayoutManifestVariant 追加并激活新版式", () => {
  const manifest: LayoutManifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: "default",
    variants: [{ id: "default", label: "默认", publishStatus: "draft" }],
  };
  const next = appendLayoutManifestVariant(manifest, {
    id: "restore-run-1",
    label: "还原-1",
    publishStatus: "draft",
  });
  assert.equal(next.activeLayoutVariantId, "restore-run-1");
  assert.equal(next.variants.length, 2);
});
