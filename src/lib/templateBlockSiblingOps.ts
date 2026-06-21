import type { EmailBlock, EmailTemplate, RepeatRegionBinding } from "../types/email";
import { collectSubtreeBlockIds } from "./deleteTemplateBlock";
import { uniqueTemplateBlockId } from "./templateBlockId";
import { isRepeatHostBlock } from "./repeatRegion";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export type SiblingMoveState = {
  parentId: string;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function getBlockSiblingMoveState(
  template: EmailTemplate,
  blockId: string
): SiblingMoveState | null {
  if (blockId === template.rootBlockId) return null;
  const block = template.blocks[blockId];
  if (!block?.parentId) return null;
  const parent = template.blocks[block.parentId];
  if (!parent) return null;
  const index = (parent.children ?? []).indexOf(blockId);
  if (index < 0) return null;
  const len = parent.children?.length ?? 0;
  return {
    parentId: parent.id,
    index,
    canMoveUp: index > 0,
    canMoveDown: index < len - 1,
  };
}

function syncRepeatManagedChildOrder(parent: EmailBlock): void {
  const repeat = parent.repeat;
  if (!repeat) return;
  const children = parent.children ?? [];
  const orderOf = (id: string) => {
    const at = children.indexOf(id);
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
  parent.repeat = {
    ...repeat,
    prototypeChildIds: [...repeat.prototypeChildIds].sort((a, b) => orderOf(a) - orderOf(b)),
    fallbackChildIds: [...repeat.fallbackChildIds].sort((a, b) => orderOf(a) - orderOf(b)),
  };
}

function remapRepeatBindingIds(
  repeat: RepeatRegionBinding,
  idMap: Map<string, string>
): RepeatRegionBinding {
  const next: RepeatRegionBinding = {
    ...repeat,
    prototypeChildIds: repeat.prototypeChildIds.map((id) => idMap.get(id) ?? id),
    fallbackChildIds: repeat.fallbackChildIds.map((id) => idMap.get(id) ?? id),
  };
  if (repeat.fieldMappings?.length) {
    next.fieldMappings = repeat.fieldMappings.map((mapping) => ({
      ...mapping,
      targetBlockId: idMap.get(mapping.targetBlockId) ?? mapping.targetBlockId,
    }));
  }
  return next;
}

function remapFieldMappingsInTemplate(template: EmailTemplate, idMap: Map<string, string>): void {
  for (const block of Object.values(template.blocks)) {
    if (!block.repeat?.fieldMappings?.length) continue;
    block.repeat = {
      ...block.repeat,
      fieldMappings: block.repeat.fieldMappings.map((mapping) => ({
        ...mapping,
        targetBlockId: idMap.get(mapping.targetBlockId) ?? mapping.targetBlockId,
      })),
    };
  }
}

function insertRepeatManagedChildAfter(
  host: EmailBlock,
  afterChildId: string,
  newChildId: string
): void {
  if (!host.repeat) return;
  const proto = host.repeat.prototypeChildIds;
  if (proto.includes(afterChildId)) {
    const at = proto.indexOf(afterChildId);
    host.repeat = {
      ...host.repeat,
      prototypeChildIds: [...proto.slice(0, at + 1), newChildId, ...proto.slice(at + 1)],
    };
    return;
  }
  const fb = host.repeat.fallbackChildIds;
  if (fb.includes(afterChildId)) {
    const at = fb.indexOf(afterChildId);
    host.repeat = {
      ...host.repeat,
      fallbackChildIds: [...fb.slice(0, at + 1), newChildId, ...fb.slice(at + 1)],
    };
  }
}

/** 向 repeat 宿主 children 插入新块后，同步 prototypeChildIds / fallbackChildIds。 */
export function finalizeRepeatHostChildInsert(host: EmailBlock, newChildId: string): void {
  const repeat = host.repeat;
  if (!repeat || !isRepeatHostBlock(host)) return;
  if (repeat.prototypeChildIds.includes(newChildId) || repeat.fallbackChildIds.includes(newChildId)) {
    return;
  }

  const children = host.children ?? [];
  const newIdx = children.indexOf(newChildId);
  if (newIdx < 0) return;

  const protoIndices = repeat.prototypeChildIds
    .map((id) => children.indexOf(id))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  if (protoIndices.length === 0) {
    host.repeat = {
      ...repeat,
      prototypeChildIds: [...repeat.prototypeChildIds, newChildId],
    };
    return;
  }

  const regionStart = protoIndices[0]!;
  const regionEnd = protoIndices[protoIndices.length - 1]!;
  if (newIdx < regionStart || newIdx > regionEnd + 1) {
    return;
  }

  let afterId: string | null = null;
  for (let i = newIdx - 1; i >= 0; i--) {
    const cid = children[i]!;
    if (repeat.prototypeChildIds.includes(cid)) {
      afterId = cid;
      break;
    }
  }

  if (afterId) {
    insertRepeatManagedChildAfter(host, afterId, newChildId);
  } else {
    host.repeat = {
      ...repeat,
      prototypeChildIds: [newChildId, ...repeat.prototypeChildIds],
    };
  }
  syncRepeatManagedChildOrder(host);
}

function removeRepeatManagedChildRef(host: EmailBlock, childId: string): void {
  if (!host.repeat) return;
  const prototypeChildIds = host.repeat.prototypeChildIds.filter((id) => id !== childId);
  const fallbackChildIds = host.repeat.fallbackChildIds.filter((id) => id !== childId);
  if (
    prototypeChildIds.length !== host.repeat.prototypeChildIds.length ||
    fallbackChildIds.length !== host.repeat.fallbackChildIds.length
  ) {
    host.repeat = {
      ...host.repeat,
      prototypeChildIds,
      fallbackChildIds,
    };
  }
}

export function moveBlockToParentIndex(
  template: EmailTemplate,
  blockId: string,
  targetParentId: string,
  targetInsertIndex: number
): EmailTemplate {
  if (blockId === template.rootBlockId) {
    throw new Error("不能移动邮件根");
  }
  const block = template.blocks[blockId];
  if (!block?.parentId) {
    throw new Error("当前区块不可移动");
  }
  const targetParent = template.blocks[targetParentId];
  if (!targetParent || !isCanvasInsertParentBlock(targetParent)) {
    throw new Error("目标父区块不支持容纳子级");
  }

  const next = clone(template);
  const moving = next.blocks[blockId];
  if (!moving?.parentId) throw new Error("当前区块不可移动");

  const oldParentId = moving.parentId;
  const oldParent = next.blocks[oldParentId];
  if (!oldParent?.children) throw new Error("父级区块不存在");

  const oldChildren = [...oldParent.children];
  const oldIndex = oldChildren.indexOf(blockId);
  if (oldIndex < 0) throw new Error("区块不在父级 children 中");

  const newParent = next.blocks[targetParentId];
  if (!newParent) throw new Error("目标父区块不存在");

  let insertAt = targetInsertIndex;
  if (insertAt < 0 || insertAt > (newParent.children?.length ?? 0)) {
    throw new Error("插入位置无效");
  }

  if (oldParentId === targetParentId) {
    if (insertAt > oldIndex) insertAt -= 1;
    if (insertAt === oldIndex) {
      throw new Error("位置未变化");
    }
  }

  oldChildren.splice(oldIndex, 1);
  oldParent.children = oldChildren;
  if (isRepeatHostBlock(oldParent)) {
    removeRepeatManagedChildRef(oldParent, blockId);
    syncRepeatManagedChildOrder(oldParent);
  }

  const newChildren = [...(newParent.children ?? [])];
  newChildren.splice(insertAt, 0, blockId);
  newParent.children = newChildren;
  moving.parentId = targetParentId;

  if (isRepeatHostBlock(newParent)) {
    finalizeRepeatHostChildInsert(newParent, blockId);
    syncRepeatManagedChildOrder(newParent);
  }

  return next;
}

function isCanvasInsertParentBlock(block: EmailBlock): boolean {
  return (
    block.type === "emailRoot" ||
    block.type === "layout" ||
    block.type === "grid" ||
    block.type === "image"
  );
}

export function moveBlockAmongSiblings(
  template: EmailTemplate,
  blockId: string,
  direction: "up" | "down"
): EmailTemplate {
  const state = getBlockSiblingMoveState(template, blockId);
  if (!state) throw new Error("当前区块不可移动");
  if (direction === "up" && !state.canMoveUp) {
    throw new Error("已在同级最前，无法上移");
  }
  if (direction === "down" && !state.canMoveDown) {
    throw new Error("已在同级最后，无法下移");
  }
  const targetIndex = direction === "up" ? state.index - 1 : state.index + 1;

  const next = clone(template);
  const parent = next.blocks[state.parentId];
  if (!parent?.children) throw new Error("父级区块不存在");
  const children = [...parent.children];
  const swapWith = children[targetIndex];
  if (!swapWith) throw new Error("无法交换同级顺序");
  children[state.index] = swapWith;
  children[targetIndex] = blockId;
  parent.children = children;
  if (isRepeatHostBlock(parent)) {
    syncRepeatManagedChildOrder(parent);
  }
  return next;
}

export function duplicateBlockBelow(
  template: EmailTemplate,
  blockId: string
): { template: EmailTemplate; duplicatedRootId: string } {
  const block = template.blocks[blockId];
  if (!block?.parentId) {
    throw new Error("不能复制邮件根节点或无父级区块");
  }
  const parentId = block.parentId;
  const subtreeIds = collectSubtreeBlockIds(template, blockId);
  const next = clone(template);
  const idMap = new Map<string, string>();

  for (const oldId of subtreeIds) {
    const old = template.blocks[oldId];
    if (!old) continue;
    idMap.set(oldId, uniqueTemplateBlockId(next, old.type));
  }
  const parent = next.blocks[parentId];
  if (!parent) throw new Error("父级区块不存在");

  for (const oldId of subtreeIds) {
    const old = template.blocks[oldId]!;
    const newId = idMap.get(oldId)!;
    const copied = clone(old) as EmailBlock;
    copied.id = newId;
    copied.parentId = old.parentId ? (idMap.get(old.parentId) ?? old.parentId) : old.parentId;
    copied.children = (old.children ?? []).map((cid) => idMap.get(cid) ?? cid);
    if (copied.repeat) {
      copied.repeat = remapRepeatBindingIds(copied.repeat, idMap);
    }
    next.blocks[newId] = copied;
    const meta = template.blockMeta?.[oldId];
    if (meta) {
      next.blockMeta = next.blockMeta ?? {};
      next.blockMeta[newId] = { ...meta };
    }
  }

  remapFieldMappingsInTemplate(next, idMap);

  const newRootId = idMap.get(blockId)!;
  const insertAt = (parent.children ?? []).indexOf(blockId);
  if (insertAt < 0) throw new Error("父级 children 中找不到当前区块");
  parent.children = [...(parent.children ?? [])];
  parent.children.splice(insertAt + 1, 0, newRootId);
  insertRepeatManagedChildAfter(parent, blockId, newRootId);
  if (isRepeatHostBlock(parent)) {
    syncRepeatManagedChildOrder(parent);
  }

  return { template: next, duplicatedRootId: newRootId };
}
