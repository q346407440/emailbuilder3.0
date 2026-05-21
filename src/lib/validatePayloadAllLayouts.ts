import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { validatePayloadAgainstTemplate } from "./validate";

export type LayoutPayloadIssue = { path: string; reason: string };

/** 对照多个版式 template 校验同一份场景级 payload（与 server PUT payload 一致） */
export function validatePayloadAgainstAllLayoutTemplates(
  payload: EmailPayload,
  templates: Array<{ layoutVariantId: string; template: EmailTemplate }>
): LayoutPayloadIssue[] {
  const issues: LayoutPayloadIssue[] = [];
  for (const { layoutVariantId, template } of templates) {
    for (const issue of validatePayloadAgainstTemplate(template, payload)) {
      issues.push({
        path: layoutVariantId ? `layout:${layoutVariantId}/${issue.path}` : issue.path,
        reason: issue.reason,
      });
    }
  }
  return issues;
}

export type FetchLayoutTemplate = (
  layoutVariantId: string
) => Promise<EmailTemplate>;

/**
 * 拉取场景内全部版式 template 并对 payload 校验。
 * `currentLayoutVariantId` 对应 `currentTemplate` 可避免重复请求。
 */
export async function fetchTemplatesAndValidatePayload(
  manifest: LayoutManifest,
  payload: EmailPayload,
  currentLayoutVariantId: string | null,
  currentTemplate: EmailTemplate,
  fetchTemplate: FetchLayoutTemplate
): Promise<LayoutPayloadIssue[]> {
  const templates: Array<{ layoutVariantId: string; template: EmailTemplate }> = [];
  for (const v of manifest.variants) {
    if (v.id === currentLayoutVariantId) {
      templates.push({ layoutVariantId: v.id, template: currentTemplate });
    } else {
      templates.push({ layoutVariantId: v.id, template: await fetchTemplate(v.id) });
    }
  }
  return validatePayloadAgainstAllLayoutTemplates(payload, templates);
}
