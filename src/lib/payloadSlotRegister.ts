import type { EmailPayload, PayloadSlotDefinition } from "../types/email";

/** payload.slots 中是否已存在该 slotId */
export function isPayloadSlotIdTaken(payload: EmailPayload, slotId: string): boolean {
  const id = slotId.trim();
  if (!id) return false;
  return Object.prototype.hasOwnProperty.call(payload.slots ?? {}, id);
}

/** 在 payload.slots 登记变量（已存在则仅合并缺失字段）；可选写入 values 初值 */
export function registerPayloadSlot(
  payload: EmailPayload,
  slotId: string,
  def: PayloadSlotDefinition,
  seedValue?: unknown
): EmailPayload {
  const id = slotId.trim();
  const p = structuredClone(payload);
  const existing = p.slots[id];
  p.slots = {
    ...p.slots,
    [id]: existing
      ? {
          ...existing,
          label: def.label?.trim() || existing.label,
          valueType: def.valueType ?? existing.valueType,
          description: def.description ?? existing.description,
          itemFields: def.itemFields ?? existing.itemFields,
          minItems: def.minItems ?? existing.minItems,
          maxItems: def.maxItems ?? existing.maxItems,
        }
      : def,
  };
  if (seedValue !== undefined && p.values[id] === undefined) {
    p.values = { ...p.values, [id]: seedValue };
  }
  return p;
}

/** 从字符串初值推断标量 valueType */
export function inferScalarPayloadValueType(value: unknown): PayloadSlotDefinition["valueType"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value !== "string") return "string";
  const t = value.trim();
  if (!t) return "string";
  if (/^mailto:/i.test(t) || /^tel:/i.test(t) || /^https?:\/\//i.test(t)) {
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(t)) return "image";
    return "url";
  }
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /^rgba?\(/i.test(t)) return "color";
  return "string";
}
