import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailMeta } from "../meta-contract/types";
import { CAMPAIGN_V2_BINDING_INVALID_HINT } from "../campaign-v2-contract";
import {
  isEmailTemplatePublishedForCampaign,
  isLayoutVariantPublishedForCampaign,
} from "./emailPublishStatus";

export type CampaignV2BindingCheckResult = {
  available: boolean;
  /** 不可用时为统一文案「模板异常」 */
  invalidHint: string | null;
  templateDisplayName: string;
  layoutLabel: string | null;
};

/** 校验活动已绑定的模板 + 版式是否仍可发信 / 展示（两层发布状态 + 未逻辑删除）。 */
export function checkCampaignV2BindingAvailability(
  meta: EmailMeta | null | undefined,
  manifest: LayoutManifest | null | undefined,
  layoutVariantId: string | null | undefined
): CampaignV2BindingCheckResult {
  const emailKeyFallback = meta?.displayName?.trim() || "";
  if (!meta) {
    return {
      available: false,
      invalidHint: CAMPAIGN_V2_BINDING_INVALID_HINT,
      templateDisplayName: emailKeyFallback,
      layoutLabel: null,
    };
  }

  const templateDisplayName = meta.displayName?.trim() || emailKeyFallback;
  const layoutId = (layoutVariantId ?? "").trim();

  if (!isEmailTemplatePublishedForCampaign(meta)) {
    return {
      available: false,
      invalidHint: CAMPAIGN_V2_BINDING_INVALID_HINT,
      templateDisplayName,
      layoutLabel: null,
    };
  }

  if (!manifest || !layoutId) {
    return {
      available: false,
      invalidHint: CAMPAIGN_V2_BINDING_INVALID_HINT,
      templateDisplayName,
      layoutLabel: null,
    };
  }

  const variant = manifest.variants.find((v) => v.id === layoutId);
  if (!variant || !isLayoutVariantPublishedForCampaign(variant)) {
    return {
      available: false,
      invalidHint: CAMPAIGN_V2_BINDING_INVALID_HINT,
      templateDisplayName,
      layoutLabel: variant?.label?.trim() || layoutId,
    };
  }

  return {
    available: true,
    invalidHint: null,
    templateDisplayName,
    layoutLabel: variant.label?.trim() || layoutId,
  };
}
