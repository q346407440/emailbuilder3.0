import type { EmailPayload, EmailTemplate } from "../types/email";
import { WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH } from "../render-defaults-contract/forbiddenBackgroundImageAlt";

/** payload / template 中带「替代文字」语义的标量变量槽（如 storeLogoAlt、heroImageAlt） */
export function isPayloadAltVariableSlotId(slotId: string): boolean {
  const trimmed = slotId.trim();
  return trimmed.length > 3 && trimmed.endsWith("Alt");
}

/** 从 payload 移除 *Alt 槽目录、取值与 slotOrder 引用 */
export function stripAltVariableSlotsFromPayload(payload: EmailPayload): boolean {
  let changed = false;
  const altSlotIds = new Set<string>();

  for (const slotId of Object.keys(payload.slots ?? {})) {
    if (!isPayloadAltVariableSlotId(slotId)) continue;
    altSlotIds.add(slotId);
    delete payload.slots![slotId];
    changed = true;
  }

  if (payload.values) {
    for (const slotId of altSlotIds) {
      if (slotId in payload.values) {
        delete payload.values[slotId];
        changed = true;
      }
    }
  }

  if (Array.isArray(payload.slotOrder)) {
    const nextOrder = payload.slotOrder.filter((id) => !isPayloadAltVariableSlotId(id));
    if (nextOrder.length !== payload.slotOrder.length) {
      payload.slotOrder = nextOrder;
      changed = true;
    }
  }

  if (Array.isArray(payload.detachedVariableSlotIds)) {
    const nextDetached = payload.detachedVariableSlotIds.filter((id) => !isPayloadAltVariableSlotId(id));
    if (nextDetached.length !== payload.detachedVariableSlotIds.length) {
      payload.detachedVariableSlotIds = nextDetached;
      changed = true;
    }
  }

  return changed;
}

function stripAltBindingsFromBindingRecord(
  bindings: Record<string, { slotId?: string; mode?: string; interpolationSlots?: { slotId: string }[] }>
): boolean {
  let changed = false;
  for (const [path, spec] of Object.entries(bindings)) {
    if (!spec || typeof spec !== "object") continue;
    if (
      path === WRAPPER_BACKGROUND_IMAGE_ALT_BIND_PATH ||
      path.endsWith(".backgroundImage.alt") ||
      path.endsWith(".alt")
    ) {
      delete bindings[path];
      changed = true;
      continue;
    }
    if (spec.mode === "variable" && spec.slotId && isPayloadAltVariableSlotId(spec.slotId)) {
      delete bindings[path];
      changed = true;
      continue;
    }
    if (spec.mode === "interpolate" && Array.isArray(spec.interpolationSlots)) {
      const filtered = spec.interpolationSlots.filter(
        (entry) => !isPayloadAltVariableSlotId(entry.slotId)
      );
      if (filtered.length !== spec.interpolationSlots.length) {
        spec.interpolationSlots = filtered;
        changed = true;
      }
    }
  }
  return changed;
}

/** 从 template 移除 *Alt 变量绑定与 backgroundImage.alt 持久化字段 */
export function stripAltVariableSlotsFromTemplate(template: EmailTemplate): boolean {
  let changed = false;

  for (const block of Object.values(template.blocks)) {
    const bg = block.wrapperStyle?.backgroundImage;
    if (bg && typeof bg === "object" && !Array.isArray(bg) && "alt" in bg) {
      delete bg.alt;
      changed = true;
    }
    if (block.bindings && stripAltBindingsFromBindingRecord(block.bindings)) {
      changed = true;
    }
  }

  return changed;
}

/** 递归移除 JSON 中 backgroundImage.alt（母版节等落盘结构） */
export function stripBackgroundImageAltDeep(value: unknown): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = stripBackgroundImageAltDeep(item);
      if (result.changed) changed = true;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const record = { ...(value as Record<string, unknown>) };

    for (const [key, nested] of Object.entries(record)) {
      if (
        key === "backgroundImage" &&
        nested &&
        typeof nested === "object" &&
        !Array.isArray(nested) &&
        "alt" in (nested as Record<string, unknown>)
      ) {
        const bg = { ...(nested as Record<string, unknown>) };
        delete bg.alt;
        record[key] = bg;
        changed = true;
        continue;
      }
      const result = stripBackgroundImageAltDeep(nested);
      if (result.changed) {
        changed = true;
        record[key] = result.value;
      }
    }

    return { value: record, changed };
  }

  return { value, changed: false };
}
