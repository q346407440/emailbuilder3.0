import type { EmailPayload, EmailTemplate, PayloadSlotDefinition } from "../types/email";
import { SLOT_ID_PATTERN } from "../payload-contract/value-types";
import {
  coerceScalarPayloadValue,
  type StandardScalarValueType,
} from "../payload-contract/standard-scalar-types";
import { getAtPath, setAtPath } from "./paths";

const interpolationTokenRe = (slotId: string) =>
  new RegExp(`\\{\\{\\s*${slotId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\}\\}`, "g");

function renameInterpolationInString(source: string, oldSlotId: string, newSlotId: string): string {
  return source.replace(interpolationTokenRe(oldSlotId), `{{ ${newSlotId} }}`);
}

function readBindPathString(block: EmailTemplate["blocks"][string], bindPath: string): string | null {
  const [root, ...rest] = bindPath.split(".");
  const subPath = rest.join(".");
  if (!subPath) return null;
  if (root === "props") {
    const raw = getAtPath(block.props as Record<string, unknown>, subPath);
    return typeof raw === "string" ? raw : null;
  }
  if (root === "wrapperStyle") {
    const raw = getAtPath((block.wrapperStyle ?? {}) as Record<string, unknown>, subPath);
    return typeof raw === "string" ? raw : null;
  }
  return null;
}

function writeBindPathString(
  block: EmailTemplate["blocks"][string],
  bindPath: string,
  value: string
): void {
  const [root, ...rest] = bindPath.split(".");
  const subPath = rest.join(".");
  if (!subPath) return;
  if (root === "props") {
    setAtPath(block.props as Record<string, unknown>, subPath, value);
  } else if (root === "wrapperStyle") {
    if (!block.wrapperStyle) block.wrapperStyle = {};
    setAtPath(block.wrapperStyle as Record<string, unknown>, subPath, value);
  }
}

/** 更新 payload.slots 中的展示名（唯一真源） */
export function updateExternalVariableSlotLabel(
  payload: EmailPayload,
  slotId: string,
  label: string,
  description?: string
): EmailPayload {
  const p = structuredClone(payload);
  const entry = p.slots[slotId];
  if (!entry) return payload;
  const trimmedLabel = label.trim();
  const trimmedDesc = description?.trim();
  const next: PayloadSlotDefinition = {
    ...entry,
    label: trimmedLabel || entry.label,
  };
  if (description !== undefined) {
    next.description = trimmedDesc || undefined;
  }
  p.slots = { ...p.slots, [slotId]: next };
  return p;
}

/** 更新标准标量变量的 valueType，并同步模板绑定与 payload.values 形态 */
export function updateExternalVariableSlotValueType(
  template: EmailTemplate,
  payload: EmailPayload,
  slotId: string,
  valueType: StandardScalarValueType
): { template: EmailTemplate; payload: EmailPayload } {
  const entry = payload.slots[slotId];
  if (!entry || entry.valueType === valueType) {
    return { template, payload };
  }

  const p = structuredClone(payload);
  p.slots = {
    ...p.slots,
    [slotId]: { ...entry, valueType },
  };
  if (Object.prototype.hasOwnProperty.call(p.values, slotId)) {
    p.values = {
      ...p.values,
      [slotId]: coerceScalarPayloadValue(p.values[slotId], valueType),
    };
  }

  const t = structuredClone(template);
  for (const block of Object.values(t.blocks)) {
    if (block.visibility?.slotId === slotId && block.visibility.valueType) {
      block.visibility = { ...block.visibility, valueType };
    }
    if (!block.bindings) continue;
    for (const spec of Object.values(block.bindings)) {
      if (spec.mode === "variable" && spec.allowExternal === true && spec.slotId === slotId) {
        spec.valueType = valueType;
      }
    }
  }

  return { template: t, payload: p };
}

export type RenameExternalVariableSlotResult = {
  template: EmailTemplate;
  payload: EmailPayload;
  error?: string;
};

/**
 * 重命名外部变量槽：同步 payload.slots、values、template 全部绑定与 interpolate 占位符。
 */
export function renameExternalVariableSlot(
  template: EmailTemplate,
  payload: EmailPayload,
  oldSlotId: string,
  newSlotId: string
): RenameExternalVariableSlotResult {
  const trimmed = newSlotId.trim();
  if (!trimmed) return { template, payload, error: "变量标识不能为空。" };
  if (!SLOT_ID_PATTERN.test(trimmed)) {
    return {
      template,
      payload,
      error: "变量标识须以字母开头，且只能包含字母、数字和下划线。",
    };
  }
  if (trimmed === oldSlotId) return { template, payload };

  if (payload.slots[trimmed]) {
    return { template, payload, error: `变量标识「${trimmed}」已被其他变量使用。` };
  }

  const t = structuredClone(template);
  for (const block of Object.values(t.blocks)) {
    if (block.repeat?.slotId === oldSlotId) {
      block.repeat = { ...block.repeat, slotId: trimmed };
    }
    if (block.visibility?.slotId === oldSlotId) {
      block.visibility = { ...block.visibility, slotId: trimmed };
    }
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      if (spec.mode === "variable" && spec.slotId === oldSlotId) {
        spec.slotId = trimmed;
      }
      if (spec.mode === "interpolate" && spec.interpolationSlots) {
        let changed = false;
        for (const slot of spec.interpolationSlots) {
          if (slot.slotId === oldSlotId) {
            slot.slotId = trimmed;
            changed = true;
          }
        }
        if (changed) {
          const current = readBindPathString(block, bindPath);
          if (current) writeBindPathString(block, bindPath, renameInterpolationInString(current, oldSlotId, trimmed));
        }
      }
    }
  }

  const p = structuredClone(payload);
  if (p.slots[oldSlotId]) {
    const nextSlots = { ...p.slots };
    nextSlots[trimmed] = nextSlots[oldSlotId]!;
    delete nextSlots[oldSlotId];
    p.slots = nextSlots;
  }
  if (Object.prototype.hasOwnProperty.call(p.values, oldSlotId)) {
    const val = p.values[oldSlotId];
    const nextValues = { ...p.values };
    delete nextValues[oldSlotId];
    nextValues[trimmed] = val;
    p.values = nextValues;
  }
  if (p.detachedVariableSlotIds?.includes(oldSlotId)) {
    p.detachedVariableSlotIds = p.detachedVariableSlotIds.map((id) => (id === oldSlotId ? trimmed : id));
  }

  return { template: t, payload: p };
}
