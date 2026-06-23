import type { EmailTemplate } from "../types/email";
import { stableStringify } from "./stableStringify";

/**
 * P2a：全量 build 后复用未变 block 的对象引用，使 BlockView memo 命中。
 * 语义不变：仅当 block 深相等时复用 prev 引用。
 */
export function reuseFlatTemplateBlockReferences(
  prev: EmailTemplate,
  next: EmailTemplate
): EmailTemplate {
  if (prev.rootBlockId !== next.rootBlockId) return next;

  const blocks: EmailTemplate["blocks"] = { ...next.blocks };
  for (const id of Object.keys(blocks)) {
    const prevBlock = prev.blocks[id];
    const nextBlock = blocks[id];
    if (prevBlock && nextBlock && stableStringify(prevBlock) === stableStringify(nextBlock)) {
      blocks[id] = prevBlock;
    }
  }

  const blockMeta = next.blockMeta;
  let reusedBlockMeta = blockMeta;
  if (prev.blockMeta && blockMeta) {
    const merged = { ...blockMeta };
    let allReused = true;
    for (const id of Object.keys(merged)) {
      const p = prev.blockMeta[id];
      const n = merged[id];
      if (p && n && stableStringify(p) === stableStringify(n)) {
        merged[id] = p;
      } else {
        allReused = false;
      }
    }
    if (allReused && stableStringify(prev.blockMeta) === stableStringify(merged)) {
      reusedBlockMeta = prev.blockMeta;
    } else {
      reusedBlockMeta = merged;
    }
  }

  const unchangedTop =
    stableStringify({
      schemaVersion: prev.schemaVersion,
      templateId: prev.templateId,
      templateVersion: prev.templateVersion,
      rootBlockId: prev.rootBlockId,
    }) ===
    stableStringify({
      schemaVersion: next.schemaVersion,
      templateId: next.templateId,
      templateVersion: next.templateVersion,
      rootBlockId: next.rootBlockId,
    });

  if (
    unchangedTop &&
    Object.keys(blocks).every((id) => blocks[id] === prev.blocks[id]) &&
    reusedBlockMeta === prev.blockMeta
  ) {
    return prev;
  }

  return {
    ...next,
    blocks,
    blockMeta: reusedBlockMeta,
  };
}
