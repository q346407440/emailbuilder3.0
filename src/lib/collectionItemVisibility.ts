import type { PayloadSlotDefinition } from "../types/email";

/** 仅 loyalty 内部后台专用列表变量支持行级「不展示」 */
export function collectionSlotAllowsItemVisibility(
  slot: PayloadSlotDefinition | undefined
): boolean {
  return slot?.valueType === "collection" && slot.scene === "loyalty-internal-admin";
}

/** 解析槽级显隐：未声明或下标缺失视为展示（true） */
export function normalizeItemVisibility(
  itemCount: number,
  raw: boolean[] | undefined
): boolean[] {
  const length = Math.max(itemCount, 0);
  const out = Array.from({ length }, () => true);
  if (!Array.isArray(raw)) return out;
  for (let index = 0; index < length; index++) {
    out[index] = raw[index] !== false;
  }
  return out;
}

export function isCollectionItemVisible(
  visibility: boolean[] | undefined,
  index: number
): boolean {
  if (!Array.isArray(visibility) || index < 0) return true;
  return visibility[index] !== false;
}

/** 列表展开 / 合并前：按槽级 itemVisibility 过滤（false = 不展示） */
export function applyCollectionItemVisibility(
  items: Record<string, unknown>[],
  visibility: boolean[] | undefined,
  slot?: PayloadSlotDefinition
): Record<string, unknown>[] {
  if (!collectionSlotAllowsItemVisibility(slot)) return items;
  if (!Array.isArray(visibility) || visibility.length === 0) return items;
  return items.filter((_, index) => isCollectionItemVisible(visibility, index));
}

export function setCollectionItemVisibilityAt(
  visibility: boolean[] | undefined,
  itemCount: number,
  index: number,
  visible: boolean
): boolean[] {
  const next = normalizeItemVisibility(itemCount, visibility);
  if (index < 0 || index >= next.length) return next;
  next[index] = visible;
  return next;
}

export function resizeCollectionItemVisibility(
  visibility: boolean[] | undefined,
  nextLength: number
): boolean[] | undefined {
  const length = Math.max(nextLength, 0);
  if (length === 0) return undefined;
  const prev = normalizeItemVisibility(length, visibility);
  if (!Array.isArray(visibility) || visibility.length === 0) {
    return undefined;
  }
  return prev;
}
