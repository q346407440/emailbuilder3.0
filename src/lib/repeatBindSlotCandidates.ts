import type { RepeatRegionBinding } from "../types/email";

/** 列表绑定向导步骤 1：可选槽行（子列表 + 顶层槽合并前） */
export type RepeatSlotBindCandidateRef = {
  key: string;
  slotId: string;
  itemPath?: string;
};

/**
 * 嵌套绑定时合并候选：子列表（itemPath）在前；顶层槽排除父级已绑定的 slotId。
 */
export function mergeRepeatBindSlotCandidates<
  T extends RepeatSlotBindCandidateRef,
>(
  enclosingParentRepeat: Pick<RepeatRegionBinding, "slotId"> | null,
  subListCandidates: T[],
  topLevelCandidates: T[]
): T[] {
  const parentSlotId = enclosingParentRepeat?.slotId?.trim();
  const topLevel = parentSlotId
    ? topLevelCandidates.filter((c) => c.slotId !== parentSlotId)
    : topLevelCandidates;
  return [...subListCandidates, ...topLevel];
}
