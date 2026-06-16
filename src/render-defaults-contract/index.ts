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
  EMAIL_CANVAS_TEXT_FONT_FAMILY,
  FIXED_TEXT_LINE_HEIGHT,
  IMAGE_BACKGROUND_FALLBACK_COLOR,
  WRAPPER_BACKGROUND_IMAGE_DEFAULT_ALT,
  PREVIEW_BLOCK_OVERFLOW,
  PROJECT_BACKGROUND_CONTENT_ALIGN,
  PROJECT_LAYOUT_CONTENT_ALIGN,
  PROJECT_TEXT_CONTENT_ALIGN_VERTICAL,
  RENDER_DEFAULT_VALUES,
  projectBackgroundContentAlign,
  projectLayoutContentAlign,
  projectTextContentAlign,
} from "./values";
export {
  validateForbiddenBackgroundImageAlt,
  stripForbiddenBackgroundImageAltFromBlock,
  stripForbiddenBackgroundImageAltFromTemplate,
  WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH,
  WRAPPER_BACKGROUND_IMAGE_ALT_FORBIDDEN_REASON,
} from "./forbiddenBackgroundImageAlt";
export {
  backgroundImageFitUsesPosition,
  effectiveBackgroundImageFit,
  stripBackgroundImagePositionWhenContainFromBlock,
  stripBackgroundImagePositionWhenContainFromTemplate,
  validateForbiddenBackgroundImagePositionWhenContain,
  WRAPPER_BACKGROUND_IMAGE_POSITION_BIND_PATH,
  BACKGROUND_IMAGE_POSITION_FORBIDDEN_WHEN_CONTAIN_REASON,
} from "./backgroundImageFitSemantics";
export {
  validateForbiddenBackgroundImageChrome,
  stripForbiddenBackgroundImageChromeFromBlock,
  stripForbiddenBackgroundImageChromeFromTemplate,
  WRAPPER_BACKGROUND_IMAGE_CHROME_BIND_PATH_PREFIXES,
  WRAPPER_BACKGROUND_IMAGE_CHROME_FORBIDDEN_REASON,
} from "./forbiddenBackgroundImageChrome";
export {
  FORBIDDEN_LEGACY_PROPS_RULES,
  validateForbiddenLegacyProps,
} from "./forbiddenLegacyProps";
export {
  stripForbiddenRenderDefaultsFromBlock,
  stripForbiddenRenderDefaultsFromTemplate,
  validateRenderDefaultsForbiddenFields,
} from "./validate";
export {
  DELIVERY_EXPORT_HEIGHT_MODE_ATTR,
  DELIVERY_EXPORT_WIDTH_MODE_ATTR,
  DELIVERY_EXPORT_STRIP_ATTRS,
  DELIVERY_EXPORT_STRIP_CLASSES,
  deliveryExportBoxModeDataAttrs,
  type DeliveryExportBoxMode,
} from "./deliveryExport";
export {
  EMAIL_PRESENTATION_TABLE_HTML_ATTRS,
  EMAIL_PRESENTATION_FORBIDDEN_INLINE_STYLE_PROPERTIES,
  EMAIL_PRESENTATION_FORBIDDEN_DISPLAY_VALUES,
  EMAIL_PRESENTATION_FORBIDDEN_POSITION_VALUES,
  type EmailPresentationForbiddenInlineStyleProperty,
} from "./emailPresentation";

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
