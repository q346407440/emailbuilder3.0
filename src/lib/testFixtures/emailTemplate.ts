import type {
  EmailBlock,
  EmailTemplate,
  LayoutBlockProps,
  TextBlock,
  TextBlockProps,
} from "../../types/email";
import { EMAIL_TEMPLATE_SCHEMA_VERSION } from "../../types/email";

export const MINIMAL_TEXT_PROPS: TextBlockProps = {
  textBody: { paragraphs: [{ runs: [{ text: "" }] }] },
  bold: false,
  italic: false,
  decoration: "none",
  color: "#111111",
  fontSize: "14px",
};

export function minimalTextBlock(
  partial?: Partial<Omit<TextBlock, "type">> & { id?: string; parentId?: string | null }
): TextBlock {
  const id = partial?.id ?? "text";
  return {
    id,
    type: "text",
    parentId: partial?.parentId ?? "root",
    children: partial?.children ?? [],
    wrapperStyle: partial?.wrapperStyle ?? { widthMode: "fill", heightMode: "hug" },
    props: { ...MINIMAL_TEXT_PROPS, ...partial?.props },
    bindings: partial?.bindings ?? {},
    repeat: partial?.repeat,
    visibility: partial?.visibility,
  };
}

export function minimalLayoutBlock(
  partial?: Partial<Omit<Extract<EmailBlock, { type: "layout" }>, "type">> & {
    id?: string;
    parentId?: string | null;
  }
): Extract<EmailBlock, { type: "layout" }> {
  const id = partial?.id ?? "layout";
  const defaultProps: LayoutBlockProps = { direction: "vertical", gapMode: "fixed", gap: "8px" };
  return {
    id,
    type: "layout",
    parentId: partial?.parentId ?? "root",
    children: partial?.children ?? [],
    wrapperStyle: partial?.wrapperStyle ?? { widthMode: "fill", heightMode: "hug" },
    props: { ...defaultProps, ...partial?.props },
    bindings: partial?.bindings ?? {},
    repeat: partial?.repeat,
    visibility: partial?.visibility,
  };
}

export function minimalEmailTemplate(
  partial: Pick<EmailTemplate, "blocks"> & Partial<Omit<EmailTemplate, "blocks">>
): EmailTemplate {
  return {
    ...partial,
    schemaVersion: partial.schemaVersion ?? EMAIL_TEMPLATE_SCHEMA_VERSION,
    templateId: partial.templateId ?? "test-template",
    templateVersion: partial.templateVersion ?? 1,
    rootBlockId: partial.rootBlockId ?? "root",
    blockMeta: partial.blockMeta ?? {},
  };
}
