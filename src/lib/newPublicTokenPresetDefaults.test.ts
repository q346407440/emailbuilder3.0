import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNewPublicTokenPresetsDocument,
  derivePublicTokenPresetId,
  NEW_PUBLIC_TOKEN_PRESET_DEFAULT_TOKENS,
} from "./newPublicTokenPresetDefaults";
import { validateTokenPresets } from "./validateTokenPresets";

describe("derivePublicTokenPresetId", () => {
  it("为可 slug 的名称生成 public- 前缀 id", () => {
    assert.equal(derivePublicTokenPresetId("Brand Blue", []), "public-brand-blue");
  });

  it("纯中文无法 slug 时使用 public-preset- 前缀", () => {
    assert.match(derivePublicTokenPresetId("品牌蓝", []), /^public-preset-/);
  });

  it("与已有 id 冲突时追加序号", () => {
    assert.equal(
      derivePublicTokenPresetId("Neutral SaaS", ["public-neutral-saas"]),
      "public-neutral-saas-2"
    );
  });
});

describe("buildNewPublicTokenPresetsDocument", () => {
  it("产出可通过契约校验的文档且 tokens 为写死默认值", () => {
    const doc = buildNewPublicTokenPresetsDocument("公共·测试");
    assert.equal(doc.presets.default?.label, "公共·测试");
    assert.deepEqual(doc.presets.default?.tokens, NEW_PUBLIC_TOKEN_PRESET_DEFAULT_TOKENS);
    assert.deepEqual(validateTokenPresets(doc), []);
  });
});
