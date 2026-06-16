import type { RepeatRuntimeContext } from "../repeat-binding-contract";
import type { EmailPayload, RepeatRegionBinding } from "../types/email";
import { applyCollectionItemVisibility } from "../lib/collectionItemVisibility";
import { resolveRepeatExpansionMaxItems } from "../lib/collectionFixedLength";
import { shouldResolveDerivedCollectionPerRow } from "../lib/derivedCollectionResolve";
import { getAtPath } from "../lib/paths";
import { resolveCollectionForContext } from "../lib/resolveBuiltinCollectionItems";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveAnchoredParentItem(
  repeat: RepeatRegionBinding,
  contexts: RepeatRuntimeContext[]
): Record<string, unknown> | undefined {
  const anchorCtx = [...contexts].reverse().find((ctx) => ctx.slotId === repeat.slotId);
  return anchorCtx?.item;
}

/** 按 repeat 配置与 payload 解析待展开列表项 */
export function resolveRepeatItemsForExpansion(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[]
): Record<string, unknown>[] {
  if (!payload) return [];
  if (repeat.itemPath?.trim()) {
    const parentItem = resolveAnchoredParentItem(repeat, contexts);
    const raw = parentItem ? getAtPath(parentItem, repeat.itemPath) : undefined;
    if (!Array.isArray(raw)) return [];
    const items = raw.filter(isRecord);
    const maxItems = resolveRepeatExpansionMaxItems(repeat, payload);
    return maxItems !== undefined ? items.slice(0, maxItems) : items;
  }

  const derived = shouldResolveDerivedCollectionPerRow(repeat, payload, contexts);
  if (derived) {
    const resolved = resolveCollectionForContext(repeat.slotId, payload, {
      anchorRow: derived.anchorRow,
    });
    if (resolved.ok) {
      const slotDef = payload.slots?.[repeat.slotId];
      const filtered = applyCollectionItemVisibility(resolved.items, slotDef?.itemVisibility);
      const maxItems = resolveRepeatExpansionMaxItems(repeat, payload);
      return maxItems !== undefined ? filtered.slice(0, maxItems) : filtered;
    }
  }

  const raw = payload.values?.[repeat.slotId];
  if (!Array.isArray(raw)) return [];
  const items = raw.filter(isRecord);
  const slotDef = payload?.slots?.[repeat.slotId];
  const filtered = applyCollectionItemVisibility(items, slotDef?.itemVisibility);
  const maxItems = resolveRepeatExpansionMaxItems(repeat, payload);
  return maxItems !== undefined ? filtered.slice(0, maxItems) : filtered;
}

/** 构建单项 repeat 运行时上下文路径 */
export function buildRepeatItemContext(
  repeat: RepeatRegionBinding,
  contexts: RepeatRuntimeContext[],
  item: Record<string, unknown>,
  itemIndex: number
): { itemPath: string; nextContexts: RepeatRuntimeContext[] } {
  const anchorCtx = repeat.itemPath?.trim()
    ? [...contexts].reverse().find((ctx) => ctx.slotId === repeat.slotId)
    : null;
  const itemPath = repeat.itemPath?.trim()
    ? anchorCtx
      ? `${anchorCtx.itemPath}.${repeat.itemPath}.${itemIndex}`
      : `${repeat.itemPath}.${itemIndex}`
    : String(itemIndex);
  const nextContexts: RepeatRuntimeContext[] = [
    ...contexts,
    { slotId: repeat.slotId, itemIndex, item, itemPath },
  ];
  return { itemPath, nextContexts };
}

export function repeatGroupSize(repeat: RepeatRegionBinding): number {
  if (repeat.itemMode !== "group") return 1;
  const raw = Number(repeat.groupSize ?? 1);
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
}

export function repeatItemIndexForGroup(repeat: RepeatRegionBinding, groupIndex: number, itemOffset = 0): number {
  return groupIndex * repeatGroupSize(repeat) + Math.max(0, Math.floor(itemOffset));
}

export function repeatItemsForGroup(
  repeat: RepeatRegionBinding,
  items: Record<string, unknown>[],
  groupIndex: number
): Record<string, unknown>[] {
  const size = repeatGroupSize(repeat);
  return items.slice(groupIndex * size, groupIndex * size + size);
}

export function repeatGroupCount(repeat: RepeatRegionBinding, itemCount: number): number {
  const size = repeatGroupSize(repeat);
  return Math.ceil(itemCount / size);
}
