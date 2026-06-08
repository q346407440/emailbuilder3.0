import type { LayoutManifest, LayoutVariantEntry } from "../layout-variant-contract/types";
import type { EmailMeta, EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { META_SCHEMA_VERSION } from "../meta-contract";
import { DEFAULT_PUBLISH_STATUS } from "../publish-status-contract";
import { validateSchemaArtifact } from "../schema-registry";
import { validateLayoutManifest } from "./emailLayoutVariant";
import { listVisibleLayoutVariants } from "./layoutVariantLogicalDelete";
import {
  validatePayloadAgainstAllLayoutTemplates,
} from "./validatePayloadAllLayouts";
import { validateTemplate, type ValidationIssue } from "./validate";
import { validateTokenPresets } from "./validateTokenPresets";

export type CloneEmailSceneLayoutAsset = {
  layoutVariantId: string;
  template: EmailTemplate;
  tokenPresets: TokenPresets;
};

export type CloneEmailSceneBundle = {
  layoutManifest: LayoutManifest;
  meta: EmailMeta;
  payload: EmailPayload;
  layoutAssets: CloneEmailSceneLayoutAsset[];
};

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/** 复制场景时统一写入目标 emailKey（各版式 template 的 emailId）。 */
export function remapTemplateSceneEmailId(template: EmailTemplate, emailKey: string): EmailTemplate {
  const next = deepClone(template);
  next.emailId = emailKey;
  return next;
}

function cloneLayoutVariantEntry(
  entry: LayoutVariantEntry,
  sourceEmailKey: string
): LayoutVariantEntry {
  const now = new Date().toISOString();
  const { deletedAt: _deletedAt, ...rest } = entry;
  return {
    ...deepClone(rest),
    publishStatus: DEFAULT_PUBLISH_STATUS,
    createdAt: entry.createdAt ?? now,
    description: `复制自场景「${sourceEmailKey}」版式「${entry.id}」`,
  };
}

/**
 * 由源场景磁盘数据组装克隆包：仅含未逻辑删除的版式；发布状态重置为未发布。
 */
export function buildClonedEmailSceneBundle(params: {
  sourceEmailKey: string;
  targetEmailKey: string;
  displayName: string;
  meta: EmailMeta;
  payload: EmailPayload;
  manifest: LayoutManifest;
  layouts: CloneEmailSceneLayoutAsset[];
}): CloneEmailSceneBundle | { error: string } {
  const visible = listVisibleLayoutVariants(params.manifest.variants);
  if (visible.length === 0) {
    return { error: "源场景没有可复制的版式（均已逻辑删除）" };
  }

  const visibleIds = new Set(visible.map((v) => v.id));
  const layoutAssets: CloneEmailSceneLayoutAsset[] = [];
  for (const asset of params.layouts) {
    if (!visibleIds.has(asset.layoutVariantId)) continue;
    layoutAssets.push({
      layoutVariantId: asset.layoutVariantId,
      template: remapTemplateSceneEmailId(asset.template, params.targetEmailKey),
      tokenPresets: deepClone(asset.tokenPresets),
    });
  }

  if (layoutAssets.length === 0) {
    return { error: "源场景版式文件缺失或均不可复制" };
  }

  const variantById = new Map(visible.map((v) => [v.id, v]));
  const variants = layoutAssets
    .map((a) => variantById.get(a.layoutVariantId))
    .filter((v): v is LayoutVariantEntry => Boolean(v))
    .map((v) => cloneLayoutVariantEntry(v, params.sourceEmailKey));

  let activeLayoutVariantId = params.manifest.activeLayoutVariantId;
  if (!visibleIds.has(activeLayoutVariantId)) {
    activeLayoutVariantId = variants[0]!.id;
  }

  const now = new Date().toISOString();
  const trimmedName = params.displayName.trim();
  const { deletedAt: _metaDeleted, ...metaRest } = params.meta;

  const meta: EmailMeta = {
    ...deepClone(metaRest),
    schemaVersion: META_SCHEMA_VERSION,
    displayName: trimmedName,
    publishStatus: DEFAULT_PUBLISH_STATUS,
    createdAt: now,
    updatedAt: now,
    description: params.meta.description?.trim()
      ? params.meta.description
      : `复制自场景「${params.sourceEmailKey}」`,
  };

  return {
    layoutManifest: {
      ...deepClone(params.manifest),
      activeLayoutVariantId,
      variants,
    },
    meta,
    payload: deepClone(params.payload),
    layoutAssets,
  };
}

/** 克隆场景落盘前的契约校验（与 server POST /emails copy 路径共用）。 */
export function collectCloneEmailSceneValidationIssues(
  bundle: CloneEmailSceneBundle
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...validateLayoutManifest(bundle.layoutManifest));

  for (const issue of validateSchemaArtifact("meta", bundle.meta)) {
    issues.push({ path: issue.path, reason: issue.reason });
  }
  for (const issue of validateSchemaArtifact("payload", bundle.payload)) {
    issues.push({ path: issue.path, reason: issue.reason });
  }

  const templatesForPayload = bundle.layoutAssets.map((a) => ({
    layoutVariantId: a.layoutVariantId,
    template: a.template,
  }));
  issues.push(...validatePayloadAgainstAllLayoutTemplates(bundle.payload, templatesForPayload));

  for (const asset of bundle.layoutAssets) {
    const prefix = `layout:${asset.layoutVariantId}`;
    issues.push(
      ...validateTemplate(asset.template).map((i) => ({
        path: `${prefix}/${i.path}`,
        reason: i.reason,
      }))
    );
    issues.push(
      ...validateTokenPresets(asset.tokenPresets).map((i) => ({
        path: `${prefix}/tokenPresets/${i.path}`,
        reason: i.reason,
      }))
    );
  }

  return issues;
}
