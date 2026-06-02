import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LAYOUT_MANIFEST_SCHEMA_VERSION } from "../layout-variant-contract/types";
import { META_SCHEMA_VERSION } from "../meta-contract";
import { PAYLOAD_SCHEMA_VERSION } from "../payload-contract/types";
import { SCENE_COLLECTION_PRESET_SCHEMA_VERSION } from "../payload-contract/scene-collection-presets";
import { NESTED_TEMPLATE_SCHEMA_VERSION } from "../template-disk-contract";
import { TOKEN_PRESET_SCHEMA_VERSION } from "../token-preset-contract";
import { SCHEMA_ARTIFACTS, getSchemaArtifact } from "./index";

describe("schema-registry", () => {
  it("SCHEMA_ARTIFACTS 条目 id 唯一", () => {
    const ids = SCHEMA_ARTIFACTS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("各 artifact currentVersion 与 contract 常量一致", () => {
    const expected: Record<string, string> = {
      template: NESTED_TEMPLATE_SCHEMA_VERSION,
      master: NESTED_TEMPLATE_SCHEMA_VERSION,
      payload: PAYLOAD_SCHEMA_VERSION,
      tokenPresets: TOKEN_PRESET_SCHEMA_VERSION,
      layoutManifest: LAYOUT_MANIFEST_SCHEMA_VERSION,
      meta: META_SCHEMA_VERSION,
      sceneCollectionPreset: SCENE_COLLECTION_PRESET_SCHEMA_VERSION,
    };
    for (const artifact of SCHEMA_ARTIFACTS) {
      assert.equal(artifact.currentVersion, expected[artifact.id], artifact.id);
    }
  });

  it("getSchemaArtifact 可解析已知 id", () => {
    assert.ok(getSchemaArtifact("meta"));
    assert.equal(getSchemaArtifact("unknown" as "meta"), undefined);
  });
});
