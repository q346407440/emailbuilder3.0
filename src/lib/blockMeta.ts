import { RUNTIME_TYPE_TO_SEMANTIC } from "../block-contract/types";
import type { EmailBlock, EmailTemplate } from "../types/email";

/** 画布/树/Inspector 展示用名称（无 meta 时回退 blockId） */
export function blockDisplayName(template: EmailTemplate, blockId: string): string {
  return template.blockMeta?.[blockId]?.name?.trim() || blockId;
}

function defaultBlockMetaType(block: EmailBlock): string {
  if (block.type === "emailRoot") return "layout.container";
  return RUNTIME_TYPE_TO_SEMANTIC[block.type];
}

/** 更新 `blockMeta.name`；保留既有 `blockType`，缺失时按 runtime 类型补全。 */
export function applyBlockMetaName(
  template: EmailTemplate,
  blockId: string,
  name: string
): EmailTemplate {
  const block = template.blocks[blockId];
  if (!block) return template;

  const trimmed = name.trim();
  const nextName = trimmed.length > 0 ? trimmed : blockId;
  const prevMeta = template.blockMeta?.[blockId];

  return {
    ...template,
    blockMeta: {
      ...template.blockMeta,
      [blockId]: {
        blockType: prevMeta?.blockType ?? defaultBlockMetaType(block),
        name: nextName,
      },
    },
  };
}
