import { RUNTIME_TYPE_TO_SEMANTIC } from "../block-contract/types";
import type { EmailBlock, EmailTemplate } from "../types/email";
import { BLOCK_CATALOG_ENTRIES, type BlockCatalogEntry } from "./blockDefaults";

/** 根据区块解析组件目录项（用于插入默认保存与母版 masterId）。 */
export function resolveCatalogEntryForBlock(
  template: Pick<EmailTemplate, "blockMeta">,
  block: EmailBlock
): BlockCatalogEntry | undefined {
  if (block.type === "emailRoot") return undefined;
  const metaType = template.blockMeta?.[block.id]?.blockType;
  if (metaType) {
    const fromMeta = BLOCK_CATALOG_ENTRIES.find((e) => e.blockType === metaType);
    if (fromMeta && fromMeta.runtimeType === block.type) return fromMeta;
  }
  const semantic = RUNTIME_TYPE_TO_SEMANTIC[block.type];
  return BLOCK_CATALOG_ENTRIES.find((e) => e.blockType === semantic);
}
