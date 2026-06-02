import type { EmailPayload, PayloadSlotDefinition, RepeatRegionBinding } from "../types/email";
import {
  isDerivedSortPolicy,
  readSortPolicyFromBuiltinDataSource,
  type NormalizedBuiltinSortPolicy,
} from "../payload-contract/collection-builtin-sort-policy";
import { readSortPolicyFromPayloadSlot } from "./resolveBuiltinCollectionItems";

export type RepeatResolveContext = {
  slotId: string;
  itemIndex: number;
  item: Record<string, unknown>;
};

/** 读取槽的归一化排序/派生策略 */
export function readNormalizedSortPolicyFromSlotDef(
  def: PayloadSlotDefinition | undefined
): NormalizedBuiltinSortPolicy | null {
  const ds = def?.dataSource;
  if (ds?.type !== "remote" || ds.provider !== "builtin") return null;
  return readSortPolicyFromBuiltinDataSource(ds);
}

/** B 是否为指向 A 的相似品/搭配品派生列表 */
export function isTargetDerivedCollection(
  childSlotId: string,
  parentSlotId: string,
  payload: EmailPayload
): boolean {
  const policy = readSortPolicyFromPayloadSlot(payload, childSlotId);
  return (
    policy !== null &&
    isDerivedSortPolicy(policy) &&
    policy.targetSlotId === parentSlotId
  );
}

/**
 * 嵌套 repeat 下是否应对 B 做 per-row 逻辑重算：
 * 内层 repeat→B，B 策略 target=A，且 contexts 中已有 A 的当前行。
 */
export function shouldResolveDerivedCollectionPerRow(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatResolveContext[]
): { anchorRow: Record<string, unknown> } | null {
  if (!payload || repeat.itemPath?.trim()) return null;
  const policy = readSortPolicyFromPayloadSlot(payload, repeat.slotId);
  if (!policy || !isDerivedSortPolicy(policy)) return null;

  const anchorCtx = [...contexts]
    .reverse()
    .find((ctx) => ctx.slotId === policy.targetSlotId);
  if (!anchorCtx) return null;

  return { anchorRow: anchorCtx.item };
}
