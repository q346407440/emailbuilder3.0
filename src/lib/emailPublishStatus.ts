import type { LayoutVariantEntry } from "../layout-variant-contract/types";
import type { EmailMeta } from "../meta-contract/types";
import {
  DEFAULT_PUBLISH_STATUS,
  isPublishedPublishStatus,
  isPublishStatus,
  type PublishStatus,
} from "../publish-status-contract";
import { isLogicallyDeleted } from "./logicalDelete";

export function normalizePublishStatus(raw: unknown): PublishStatus {
  return isPublishStatus(raw) ? raw : DEFAULT_PUBLISH_STATUS;
}

/** 活动 V2「邮件模板」下拉：已发布且未逻辑删除。 */
export function isEmailTemplatePublishedForCampaign(meta: EmailMeta | null | undefined): boolean {
  if (!meta || isLogicallyDeleted(meta)) return false;
  return isPublishedPublishStatus(normalizePublishStatus(meta.publishStatus));
}

/** 活动 V2「版式」下拉：已发布且未逻辑删除。 */
export function isLayoutVariantPublishedForCampaign(variant: LayoutVariantEntry): boolean {
  if (isLogicallyDeleted(variant)) return false;
  return isPublishedPublishStatus(normalizePublishStatus(variant.publishStatus));
}

export function listLayoutVariantsPublishedForCampaign(
  variants: LayoutVariantEntry[]
): LayoutVariantEntry[] {
  return variants.filter(isLayoutVariantPublishedForCampaign);
}
