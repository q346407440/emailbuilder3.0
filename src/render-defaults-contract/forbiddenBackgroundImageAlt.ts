import type { EmailBlock, EmailTemplate } from "../types/email";
import type { RenderDefaultsContractIssue } from "./types";

export const WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH = "wrapperStyle.backgroundImage.alt";

/** 与 rules.ts `forbid.backgroundImageAlt` 一致 */
export const WRAPPER_BACKGROUND_IMAGE_ALT_FORBIDDEN_REASON =
  "wrapperStyle.backgroundImage.alt 已禁止持久化；替代文本由渲染层统一使用「此处是图片」";

function issue(path: string): RenderDefaultsContractIssue {
  return { path, reason: WRAPPER_BACKGROUND_IMAGE_ALT_FORBIDDEN_REASON };
}

export function validateForbiddenBackgroundImageAlt(
  template: EmailTemplate
): RenderDefaultsContractIssue[] {
  const issues: RenderDefaultsContractIssue[] = [];
  for (const [id, block] of Object.entries(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    const bg = block.wrapperStyle?.backgroundImage;
    if (bg && typeof bg === "object" && !Array.isArray(bg) && "alt" in bg) {
      issues.push(issue(`blocks.${id}.wrapperStyle.backgroundImage.alt`));
    }
    if (block.bindings?.[WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH]) {
      issues.push(issue(`blocks.${id}.bindings.${WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH}`));
    }
  }
  return issues;
}

export function stripForbiddenBackgroundImageAltFromBlock(block: EmailBlock): boolean {
  let changed = false;
  const bg = block.wrapperStyle?.backgroundImage;
  if (bg && typeof bg === "object" && !Array.isArray(bg) && "alt" in bg) {
    const next = { ...(bg as Record<string, unknown>) };
    delete next.alt;
    block.wrapperStyle = { ...block.wrapperStyle, backgroundImage: next as typeof bg };
    changed = true;
  }
  if (block.bindings?.[WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH]) {
    const nextBindings = { ...block.bindings };
    delete nextBindings[WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH];
    block.bindings = nextBindings;
    changed = true;
  }
  return changed;
}

export function stripForbiddenBackgroundImageAltFromTemplate(template: EmailTemplate): boolean {
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    if (stripForbiddenBackgroundImageAltFromBlock(block)) changed = true;
  }
  return changed;
}
