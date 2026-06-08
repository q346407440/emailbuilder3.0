import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendLayoutVariant,
  deriveLayoutVariantIdFromLabel,
  sortLayoutVariantsByCreatedDesc,
  updateLayoutVariantLabel,
} from "./layoutVariantOps";
import { LAYOUT_MANIFEST_SCHEMA_VERSION } from "../layout-variant-contract/types";

describe("deriveLayoutVariantIdFromLabel", () => {
  it("英文名称生成 slug", () => {
    assert.equal(deriveLayoutVariantIdFromLabel("Card Layout", []), "card-layout");
  });

  it("冲突时追加后缀", () => {
    assert.equal(deriveLayoutVariantIdFromLabel("centered", ["centered"]), "centered-2");
  });
});

describe("layout manifest helpers", () => {
  const base = {
    schemaVersion: LAYOUT_MANIFEST_SCHEMA_VERSION,
    activeLayoutVariantId: "default",
    variants: [{ id: "default", label: "默认", publishStatus: "published" }],
  };

  it("追加新版式并可设为当前", () => {
    const next = appendLayoutVariant(
      base,
      { id: "card", label: "卡片版", publishStatus: "draft" },
      { makeActive: true }
    );
    assert.equal(next.variants.length, 2);
    assert.equal(next.activeLayoutVariantId, "card");
  });

  it("更新版式名称", () => {
    const next = updateLayoutVariantLabel(base, "default", "  主版式  ");
    assert.equal(next.variants[0]?.label, "主版式");
  });

  it("按 createdAt 倒序排列版式", () => {
    const sorted = sortLayoutVariantsByCreatedDesc([
      { id: "old", label: "旧", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", label: "新", createdAt: "2026-03-01T00:00:00.000Z" },
      { id: "mid", label: "中", createdAt: "2026-02-01T00:00:00.000Z" },
    ]);
    assert.deepEqual(sorted.map((v) => v.id), ["new", "mid", "old"]);
  });
});
