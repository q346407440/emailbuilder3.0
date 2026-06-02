import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveEmailKeyFromDisplayName, buildNewEmailScaffold, buildBlankLayoutVariantAssets } from "./scaffoldNewEmail";
import { META_SCHEMA_VERSION } from "../meta-contract/types";
import { validateTemplate } from "./validate";
import { validateTokenPresets } from "./validateTokenPresets";

describe("deriveEmailKeyFromDisplayName", () => {
  it("由英文名称生成 slug", () => {
    assert.equal(deriveEmailKeyFromDisplayName("Spring Sale", []), "spring-sale");
  });

  it("纯中文名称回退为 template- 前缀", () => {
    const key = deriveEmailKeyFromDisplayName("春节大促", []);
    assert.match(key, /^template-[a-z0-9]+$/);
  });

  it("冲突时追加数字后缀", () => {
    assert.equal(deriveEmailKeyFromDisplayName("promo", ["promo"]), "promo-2");
  });
});

describe("buildBlankLayoutVariantAssets", () => {
  it("非 default 版式使用独立 block id 前缀", () => {
    const { template } = buildBlankLayoutVariantAssets("demo-new", "card");
    assert.equal(template.templateId, "demo-new-card");
    assert.equal(template.rootBlockId, "demo-new-card-root");
    assert.deepEqual(validateTemplate(template), []);
  });
});

describe("buildNewEmailScaffold", () => {
  it("产出可通过契约校验的最小模板", () => {
    const bundle = buildNewEmailScaffold("demo-new", "演示模板");
    assert.equal(bundle.meta.displayName, "演示模板");
    assert.equal(bundle.meta.schemaVersion, META_SCHEMA_VERSION);
    assert.deepEqual(validateTemplate(bundle.template), []);
    assert.deepEqual(validateTokenPresets(bundle.tokenPresets), []);
    assert.equal(bundle.layoutManifest.activeLayoutVariantId, "default");
  });
});
