import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LayoutVariantEntry } from "../layout-variant-contract/types";
import type { EmailMeta } from "../meta-contract/types";
import { META_SCHEMA_VERSION } from "../meta-contract/types";
import {
  isEmailTemplatePublishedForCampaign,
  isLayoutVariantPublishedForCampaign,
  listLayoutVariantsPublishedForCampaign,
} from "./emailPublishStatus";

const baseMeta = (): EmailMeta => ({
  schemaVersion: META_SCHEMA_VERSION,
  displayName: "测试",
  publishStatus: "published",
});

describe("emailPublishStatus", () => {
  it("模板：已发布且未删除可通过活动筛选", () => {
    assert.equal(isEmailTemplatePublishedForCampaign(baseMeta()), true);
  });

  it("模板：草稿或已删除不可通过活动筛选", () => {
    assert.equal(
      isEmailTemplatePublishedForCampaign({ ...baseMeta(), publishStatus: "draft" }),
      false
    );
    assert.equal(
      isEmailTemplatePublishedForCampaign({ ...baseMeta(), deletedAt: new Date().toISOString() }),
      false
    );
  });

  it("版式：仅返回已发布且未删除项", () => {
    const variants: LayoutVariantEntry[] = [
      { id: "a", label: "A", publishStatus: "published" },
      { id: "b", label: "B", publishStatus: "draft" },
      { id: "c", label: "C", publishStatus: "published", deletedAt: "2026-01-01T00:00:00.000Z" },
    ];
    const published = listLayoutVariantsPublishedForCampaign(variants);
    assert.equal(published.length, 1);
    assert.equal(published[0]?.id, "a");
    assert.equal(isLayoutVariantPublishedForCampaign(variants[1]!), false);
  });
});
