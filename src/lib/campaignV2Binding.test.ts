import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailMeta } from "../meta-contract/types";
import { META_SCHEMA_VERSION } from "../meta-contract/types";
import { CAMPAIGN_V2_BINDING_INVALID_HINT } from "../campaign-v2-contract";
import { checkCampaignV2BindingAvailability } from "./campaignV2Binding";

const metaPublished = (): EmailMeta => ({
  schemaVersion: META_SCHEMA_VERSION,
  publishStatus: "published",
  displayName: "测试模板",
});

const manifestWithCard = (): LayoutManifest => ({
  schemaVersion: "1.0.0",
  activeLayoutVariantId: "card",
  variants: [
    { id: "card", label: "卡片版", publishStatus: "published" },
    { id: "draft-layout", label: "草稿版", publishStatus: "draft" },
  ],
});

describe("checkCampaignV2BindingAvailability", () => {
  it("模板与版式均已发布时可用", () => {
    const r = checkCampaignV2BindingAvailability(metaPublished(), manifestWithCard(), "card");
    assert.equal(r.available, true);
    assert.equal(r.invalidHint, null);
  });

  it("模板草稿或删除时返回统一模板异常", () => {
    const r = checkCampaignV2BindingAvailability(
      { ...metaPublished(), publishStatus: "draft" },
      manifestWithCard(),
      "card"
    );
    assert.equal(r.available, false);
    assert.equal(r.invalidHint, CAMPAIGN_V2_BINDING_INVALID_HINT);
  });

  it("版式未发布时返回统一模板异常", () => {
    const r = checkCampaignV2BindingAvailability(metaPublished(), manifestWithCard(), "draft-layout");
    assert.equal(r.available, false);
    assert.equal(r.invalidHint, CAMPAIGN_V2_BINDING_INVALID_HINT);
  });
});
