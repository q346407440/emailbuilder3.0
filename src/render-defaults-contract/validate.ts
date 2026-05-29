import type { EmailBlock, EmailTemplate } from "../types/email";
import type { RenderDefaultsContractIssue } from "./types";
import {
  findForbiddenWrapperStyleKey,
  WRAPPER_STYLE_FORBIDDEN_FIELD_REASON,
  FORBIDDEN_WRAPPER_STYLE_KEYS,
} from "./forbiddenWrapperStyleKeys";

function issue(path: string, reason: string): RenderDefaultsContractIssue {
  return { path, reason };
}

/** 校验 template 是否违反「禁止持久化」规则（wrapperStyle 子集；其余禁止项仍在 validate.ts） */
export function validateRenderDefaultsForbiddenFields(
  template: EmailTemplate
): RenderDefaultsContractIssue[] {
  const issues: RenderDefaultsContractIssue[] = [];
  for (const [id, block] of Object.entries(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    const ws = block.wrapperStyle;
    if (!ws || typeof ws !== "object" || Array.isArray(ws)) continue;
    const base = `blocks.${id}.wrapperStyle`;
    const wsRecord = ws as Record<string, unknown>;

    const forbiddenKey = findForbiddenWrapperStyleKey(wsRecord);
    if (forbiddenKey !== undefined) {
      issues.push(issue(`${base}.${forbiddenKey}`, WRAPPER_STYLE_FORBIDDEN_FIELD_REASON));
    }
  }
  return issues;
}

export function stripForbiddenRenderDefaultsFromBlock(block: EmailBlock): boolean {
  if (!block.wrapperStyle || typeof block.wrapperStyle !== "object" || Array.isArray(block.wrapperStyle)) {
    return false;
  }
  const ws = block.wrapperStyle as Record<string, unknown>;
  let changed = false;

  for (const key of FORBIDDEN_WRAPPER_STYLE_KEYS) {
    if (key in ws) {
      delete ws[key];
      changed = true;
    }
  }

  return changed;
}

export function stripForbiddenRenderDefaultsFromTemplate(template: EmailTemplate): boolean {
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    if (stripForbiddenRenderDefaultsFromBlock(block)) changed = true;
  }
  return changed;
}
