import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import type { TextBody } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import {
  getTextBodyContentMode,
  getTextBodyFieldSourceBindPath,
  type TextBodyContentMode,
} from "../lib/textBodyContentMode";
import { textBodyToPlainString } from "../lib/textBodyFormat";
import { InspectorFieldSource } from "./InspectorFieldSource";

const MODE_PILL: Partial<
  Record<TextBodyContentMode, { label: string; classSuffix: string }>
> = {
  inlineVariable: { label: "文中变量", classSuffix: "inline-variable" },
};

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  block: EmailBlock & { type: "text" };
  textBody: TextBody;
  mergedTemplate: EmailTemplate | null;
  effectiveDesignTokens?: ExpandedTheme | null;
  onUpdate: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onTemplateChange: (nextTemplate: EmailTemplate) => void;
  onAggregateLiteralize?: () => void;
};

/**
 * 正文（结构化）标题右侧：单个可点击来源胶囊。
 * 菜单逻辑委托代表性 bindPath 的 InspectorFieldSource，标签按正文三态聚合展示。
 */
export function TextBodyFieldSource({
  template,
  payload,
  block,
  textBody,
  mergedTemplate,
  effectiveDesignTokens = null,
  onUpdate,
  onTemplateChange,
  onAggregateLiteralize,
}: Props) {
  const mode = getTextBodyContentMode(block, textBody);
  const bindPath = getTextBodyFieldSourceBindPath(block, textBody, mode);
  const pill = MODE_PILL[mode];
  const bindModalPreviewText = textBodyToPlainString(textBody);

  return (
    <InspectorFieldSource
      template={template}
      payload={payload}
      block={block}
      mergedTemplate={mergedTemplate}
      effectiveDesignTokens={effectiveDesignTokens}
      bindPath={bindPath}
      onUpdate={onUpdate}
      onTemplateChange={onTemplateChange}
      pillLabelOverride={pill?.label}
      pillClassSuffixOverride={pill?.classSuffix}
      onAggregateLiteralize={mode !== "literal" ? onAggregateLiteralize : undefined}
      aggregateTextBodyMode={mode}
      bindModalPreviewText={bindModalPreviewText}
    />
  );
}
