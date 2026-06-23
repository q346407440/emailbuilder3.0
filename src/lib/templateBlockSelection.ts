import type { VirtualBlockRef } from "../repeat-binding-contract";
import type { PreviewInvalidationKind } from "../preview-invalidation-contract";
import type { EmailTemplate } from "../types/email";
import { resolvePhysicalBlockId } from "../repeat-runtime";

export type TemplateChangeOptions = {
  /** 模板变更后显式选中的虚拟 ref */
  selectBlockRef?: VirtualBlockRef | null;
  /** P2：单块字段编辑时的脏 block id */
  changedBlockId?: string;
  /** P2：预览失效类型（默认由变更入口推断） */
  invalidation?: PreviewInvalidationKind;
};

/**
 * 模板变更后若当前选中区块已被删除，回退到同父级下替代子节点或父级本身。
 */
export function reconcileSelectedBlockIdAfterTemplateChange(
  prevTemplate: EmailTemplate,
  nextTemplate: EmailTemplate,
  selectedBlockId: string | null
): string | null {
  if (!selectedBlockId || nextTemplate.blocks[selectedBlockId]) {
    return selectedBlockId;
  }

  const removed = prevTemplate.blocks[selectedBlockId];
  const parentId = removed?.parentId;
  if (!parentId || !nextTemplate.blocks[parentId]) {
    return null;
  }

  const prevParent = prevTemplate.blocks[parentId];
  const nextParent = nextTemplate.blocks[parentId];
  if (!prevParent || !nextParent) return parentId;

  const indexInPrev = (prevParent.children ?? []).indexOf(selectedBlockId);
  if (indexInPrev >= 0) {
    const replacement =
      nextParent.children?.[indexInPrev] ??
      nextParent.children?.[indexInPrev - 1] ??
      nextParent.children?.[0];
    if (replacement && nextTemplate.blocks[replacement]) {
      return replacement;
    }
  }

  return parentId;
}

/** VirtualBlockRef 版：repeat-item 选中在物化/解绑后回退到 physical 原型 */
export function reconcileSelectedBlockRefAfterTemplateChange(
  prevTemplate: EmailTemplate,
  nextTemplate: EmailTemplate,
  selectedBlockRef: VirtualBlockRef | null
): VirtualBlockRef | null {
  if (!selectedBlockRef) return null;
  if (selectedBlockRef.kind === "repeat-item") {
    const protoId = selectedBlockRef.prototypeRootId;
    if (nextTemplate.blocks[protoId]) {
      return { kind: "physical", blockId: protoId };
    }
    const materializedId =
      protoId === selectedBlockRef.hostId
        ? `${protoId}-${selectedBlockRef.itemIndex + 1}`
        : `${protoId}-${selectedBlockRef.itemIndex + 1}`;
    if (nextTemplate.blocks[materializedId]) {
      return { kind: "physical", blockId: materializedId };
    }
    return { kind: "physical", blockId: protoId };
  }
  const blockId = resolvePhysicalBlockId(selectedBlockRef);
  const nextId = reconcileSelectedBlockIdAfterTemplateChange(prevTemplate, nextTemplate, blockId);
  return nextId ? { kind: "physical", blockId: nextId } : null;
}
