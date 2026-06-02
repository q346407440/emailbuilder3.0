import type { RepeatRuntimeContext } from "../repeat-binding-contract";
import type { EmailPayload, RepeatRegionBinding } from "../types/email";
import { applyCollectionItemVisibility } from "../lib/collectionItemVisibility";
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
    return typeof repeat.maxItems === "number" ? items.slice(0, repeat.maxItems) : items;
  }

  const derived = shouldResolveDerivedCollectionPerRow(repeat, payload, contexts);
  if (derived) {
    const resolved = resolveCollectionForContext(repeat.slotId, payload, {
      anchorRow: derived.anchorRow,
    });
    if (resolved.ok) {
      const slotDef = payload.slots?.[repeat.slotId];
      const filtered = applyCollectionItemVisibility(resolved.items, slotDef?.itemVisibility);
      return typeof repeat.maxItems === "number"
        ? filtered.slice(0, repeat.maxItems)
        : filtered;
    }
  }

  const raw = payload.values?.[repeat.slotId];
  if (!Array.isArray(raw)) return [];
  const items = raw.filter(isRecord);
  const slotDef = payload?.slots?.[repeat.slotId];
  const filtered = applyCollectionItemVisibility(items, slotDef?.itemVisibility);
  if (typeof repeat.maxItems === "number") return filtered.slice(0, repeat.maxItems);
  return filtered;
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
