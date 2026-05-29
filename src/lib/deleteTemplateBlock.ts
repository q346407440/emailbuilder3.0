import type { EmailTemplate } from "../types/email";

function clone<T>(value: T): T {
  return structuredClone(value);
}

/** 收集 blockId 及其全部后代 id（含自身）。 */
export function collectSubtreeBlockIds(template: EmailTemplate, blockId: string): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    const block = template.blocks[id];
    if (!block) return;
    out.push(id);
    for (const childId of block.children ?? []) {
      walk(childId);
    }
  };
  walk(blockId);
  return out;
}

/**
 * 从模板中删除指定区块及其子树，并从父级 children 与 repeat fallbackChildIds 中移除引用。
 * 不可删除邮件根节点。
 */
export function deleteBlockFromTemplate(template: EmailTemplate, blockId: string): EmailTemplate {
  if (blockId === template.rootBlockId) {
    throw new Error("不能删除邮件根节点");
  }
  const block = template.blocks[blockId];
  if (!block) {
    throw new Error("区块不存在");
  }
  const parentId = block.parentId;
  if (!parentId) {
    throw new Error("不能删除没有父级的区块");
  }

  const next = clone(template);
  const parent = next.blocks[parentId];
  if (!parent) {
    throw new Error("父级区块不存在");
  }

  const removedIds = new Set(collectSubtreeBlockIds(next, blockId));
  parent.children = (parent.children ?? []).filter((id) => !removedIds.has(id));

  for (const host of Object.values(next.blocks)) {
    if (!host.repeat?.fallbackChildIds?.length) continue;
    const filtered = host.repeat.fallbackChildIds.filter((id) => !removedIds.has(id));
    if (filtered.length !== host.repeat.fallbackChildIds.length) {
      host.repeat = { ...host.repeat, fallbackChildIds: filtered };
    }
  }

  for (const id of removedIds) {
    delete next.blocks[id];
    if (next.blockMeta) delete next.blockMeta[id];
  }

  return next;
}
