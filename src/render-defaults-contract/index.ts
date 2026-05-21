export type {
  RenderDefaultRule,
  RenderDefaultsContractIssue,
  RenderRuleBlockScope,
  RenderRuleKind,
} from "./types";
export { RENDER_DEFAULT_RULES, RENDER_DEFAULT_RULE_IDS } from "./rules";
export {
  BUTTON_INNER_PADDING,
  EMAIL_ROOT_FIXED_WIDTH,
  FIXED_TEXT_LINE_HEIGHT,
  IMAGE_BACKGROUND_FALLBACK_COLOR,
  PREVIEW_BLOCK_OVERFLOW,
  PROJECT_BACKGROUND_CONTENT_ALIGN,
  PROJECT_LAYOUT_CONTENT_ALIGN,
  PROJECT_TEXT_CONTENT_ALIGN_VERTICAL,
  RENDER_DEFAULT_VALUES,
  projectBackgroundContentAlign,
  projectLayoutContentAlign,
  projectLayoutInnerStackContentAlign,
  projectTextContentAlign,
} from "./values";
export {
  stripForbiddenRenderDefaultsFromBlock,
  stripForbiddenRenderDefaultsFromTemplate,
  validateRenderDefaultsForbiddenFields,
} from "./validate";

import { RENDER_DEFAULT_RULES } from "./rules";

/** 按 kind 过滤规则目录（文档生成 / Inspector 提示可复用） */
export function listRenderDefaultRulesByKind(
  kind: import("./types").RenderRuleKind
): readonly import("./types").RenderDefaultRule[] {
  return RENDER_DEFAULT_RULES.filter((r) => r.kind === kind);
}

/** 按稳定 id 查单条规则 */
export function getRenderDefaultRule(id: string): import("./types").RenderDefaultRule | undefined {
  return RENDER_DEFAULT_RULES.find((r) => r.id === id);
}
