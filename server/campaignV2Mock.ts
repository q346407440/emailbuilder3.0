import fs from "node:fs/promises";
import path from "node:path";
import type { EmailMeta } from "../src/meta-contract/types";
import { checkCampaignV2BindingAvailability } from "../src/lib/campaignV2Binding";
import { isEmailTemplatePublishedForCampaign, listLayoutVariantsPublishedForCampaign } from "../src/lib/emailPublishStatus";
import { assertEmailKeySafe } from "../src/lib/validate";
import { readLayoutManifestOptional } from "./emailLayoutContext";

export type CampaignV2TemplateListItem = {
  emailKey: string;
  displayName: string;
};

export type CampaignV2LayoutListItem = {
  layoutVariantId: string;
  label: string;
};

type ReadJsonFn = <T>(filePath: string) => Promise<T | null>;

/** Mock：活动 V2 可选用模板（仅 meta.publishStatus === published）。 */
export async function listCampaignV2PublishedTemplates(
  dataRoot: string,
  readJson: ReadJsonFn
): Promise<CampaignV2TemplateListItem[]> {
  let names: string[] = [];
  try {
    const ents = await fs.readdir(dataRoot, { withFileTypes: true });
    names = ents.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name);
  } catch {
    return [];
  }

  const items: CampaignV2TemplateListItem[] = [];
  for (const emailKey of names) {
    const base = path.join(dataRoot, emailKey);
    const manifest = await readLayoutManifestOptional(readJson, base);
    if (!manifest) continue;
    const meta = await readJson<EmailMeta>(path.join(base, "meta.json"));
    if (!isEmailTemplatePublishedForCampaign(meta)) continue;
    items.push({
      emailKey,
      displayName: meta?.displayName?.trim() || emailKey,
    });
  }

  items.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "zh-CN", { numeric: true, sensitivity: "base" })
  );
  return items;
}

/** Mock：活动 V2 可选用版式（仅 variants[].publishStatus === published）。 */
export async function listCampaignV2PublishedLayouts(
  dataRoot: string,
  emailKey: string,
  readJson: ReadJsonFn
): Promise<{ items: CampaignV2LayoutListItem[]; error: string | null }> {
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return { items: [], error: bad };

  const base = path.join(dataRoot, emailKey);
  const meta = await readJson<EmailMeta>(path.join(base, "meta.json"));
  if (!isEmailTemplatePublishedForCampaign(meta)) {
    return { items: [], error: "该邮件模板未发布或不可用" };
  }

  const manifest = await readLayoutManifestOptional(readJson, base);
  if (!manifest) {
    return { items: [], error: "本场景未启用版式变体" };
  }

  const published = listLayoutVariantsPublishedForCampaign(manifest.variants);
  const items = published.map((v) => ({
    layoutVariantId: v.id,
    label: v.label?.trim() || v.id,
  }));

  return { items, error: null };
}

export type CampaignV2BindingCheckResponse = {
  available: boolean;
  invalidHint: string | null;
  templateDisplayName: string;
  layoutLabel: string | null;
};

/** Mock：活动已保存绑定的模板 + 版式是否仍可用（发信前 / 活动页打开时）。 */
export async function checkCampaignV2SavedBinding(
  dataRoot: string,
  emailKey: string,
  layoutVariantId: string,
  readJson: ReadJsonFn
): Promise<CampaignV2BindingCheckResponse> {
  const bad = assertEmailKeySafe(emailKey);
  if (bad) {
    return {
      available: false,
      invalidHint: checkCampaignV2BindingAvailability(null, null, layoutVariantId).invalidHint,
      templateDisplayName: emailKey,
      layoutLabel: null,
    };
  }

  const base = path.join(dataRoot, emailKey);
  const meta = await readJson<EmailMeta>(path.join(base, "meta.json"));
  const manifest = await readLayoutManifestOptional(readJson, base);
  const result = checkCampaignV2BindingAvailability(meta, manifest, layoutVariantId);
  return {
    available: result.available,
    invalidHint: result.invalidHint,
    templateDisplayName: result.templateDisplayName || emailKey,
    layoutLabel: result.layoutLabel,
  };
}
