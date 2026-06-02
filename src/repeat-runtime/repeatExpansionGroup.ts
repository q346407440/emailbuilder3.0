import type { RepeatPreviewModel, VirtualBlockRef } from "../repeat-binding-contract";
import { refsEqual } from "./repeatVirtualResolver";

/**
 * 同一 repeat 展开组：共享宿主、行模板原型与父级运行时上下文，
 * 仅 itemIndex / 末层 context 不同（虚拟预览中的「复制体」）。
 */
export function refToRepeatExpansionGroupKey(ref: VirtualBlockRef): string | null {
  if (ref.kind !== "repeat-item") return null;
  const parentStack = ref.contextStack.slice(0, -1);
  const parentKey = parentStack.map((c) => `${c.slotId}@${c.itemPath}`).join("|");
  return `repeat-expansion:${ref.hostId}:${ref.prototypeRootId}:${parentKey}`;
}

/** 两 ref 是否属于同一 repeat 展开组（含完全一致） */
export function refsShareRepeatExpansionGroup(a: VirtualBlockRef, b: VirtualBlockRef): boolean {
  if (refsEqual(a, b)) return true;
  const ga = refToRepeatExpansionGroupKey(a);
  const gb = refToRepeatExpansionGroupKey(b);
  return ga !== null && ga === gb;
}

/** 编辑器选中：物理块精确匹配；repeat-item 按展开组匹配 */
export function isRepeatExpansionGroupSelected(
  selected: VirtualBlockRef | null,
  candidate: VirtualBlockRef
): boolean {
  if (!selected) return false;
  if (selected.kind === "physical" || candidate.kind === "physical") {
    return refsEqual(selected, candidate);
  }
  return refsShareRepeatExpansionGroup(selected, candidate);
}

/** 预览树中属于同一展开组的节点数量 */
export function countRepeatExpansionGroupMembers(
  model: RepeatPreviewModel,
  ref: VirtualBlockRef
): number {
  const groupKey = refToRepeatExpansionGroupKey(ref);
  if (!groupKey) return 1;
  let count = 0;
  const visit = (node: (typeof model)["root"]) => {
    if (refToRepeatExpansionGroupKey(node.ref) === groupKey) count += 1;
    for (const child of node.children) visit(child);
  };
  visit(model.root);
  return count;
}
