import type { EmailPayload } from "../types/email";

/** 变量侧栏展示顺序：优先 slotOrder，否则 payload.slots 的登记顺序（JSON/写入顺序） */
export function getPayloadSlotIdsInOrder(payload: EmailPayload): string[] {
  const slots = payload.slots ?? {};
  const keys = Object.keys(slots);
  const order = payload.slotOrder;
  if (!order?.length) return keys;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of order) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (!Object.prototype.hasOwnProperty.call(slots, id) || seen.has(id)) continue;
    result.push(id);
    seen.add(id);
  }
  for (const id of keys) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
  }
  return result;
}

/** 新建变量后追加到 slotOrder 末尾（须在 slots 已写入该 id 之后调用） */
export function appendPayloadSlotOrder(payload: EmailPayload, slotId: string): EmailPayload {
  const id = slotId.trim();
  const slots = payload.slots ?? {};
  if (!id || !Object.prototype.hasOwnProperty.call(slots, id)) return payload;

  if (payload.slotOrder?.length) {
    if (payload.slotOrder.includes(id)) return payload;
    return { ...payload, slotOrder: [...payload.slotOrder, id] };
  }

  const keysBeforeNew = Object.keys(slots).filter((key) => key !== id);
  return { ...payload, slotOrder: [...keysBeforeNew, id] };
}

/** 删除变量时从 slotOrder 移除 */
export function removePayloadSlotFromOrder(payload: EmailPayload, slotId: string): EmailPayload {
  const id = slotId.trim();
  if (!id || !payload.slotOrder?.length) return payload;
  const next = payload.slotOrder.filter((entry) => entry !== id);
  if (next.length === payload.slotOrder.length) return payload;
  if (next.length === 0) {
    const { slotOrder: _removed, ...rest } = payload;
    return rest;
  }
  return { ...payload, slotOrder: next };
}
