import { EMAIL_TEMPLATE_SCHEMA_VERSION } from "../types/email";
import type { EmailBlock, EmailTemplate } from "../types/email";
import type { DraftBlock } from "./buildNode";

export function draftTreeToEmailTemplate(
  root: DraftBlock,
  opts: { emailId: string; templateId: string; locale: string }
): EmailTemplate {
  const blocks: Record<string, EmailBlock> = {};
  const blockMeta: NonNullable<EmailTemplate["blockMeta"]> = {};

  function walk(draft: DraftBlock, parentId: string | null): void {
    const childIds: string[] = [];
    for (const child of draft.children ?? []) {
      walk(child, draft.id);
      childIds.push(child.id);
    }

    const block: EmailBlock = {
      id: draft.id,
      type: draft.type,
      parentId,
      children: childIds,
      props: structuredClone(draft.props),
      ...(draft.wrapperStyle ? { wrapperStyle: structuredClone(draft.wrapperStyle) } : {}),
      ...(draft.bindings ? { bindings: structuredClone(draft.bindings) } : {}),
    };

    blocks[draft.id] = block;
    blockMeta[draft.id] = {
      blockType: draft.blockMeta.blockType,
      name: draft.blockMeta.name,
    };
  }

  walk(root, null);

  return {
    schemaVersion: EMAIL_TEMPLATE_SCHEMA_VERSION,
    emailId: opts.emailId,
    templateId: opts.templateId,
    templateVersion: 1,
    locale: opts.locale,
    rootBlockId: root.id,
    blockMeta,
    blocks,
  };
}
