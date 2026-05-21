import type { BindingSpec, EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { readTemplateFieldOnly, setTemplateFieldOnly } from "./themeBindingEdit";
import { getAtPath, setAtPath } from "./paths";

function readMergedField(merged: EmailTemplate, blockId: string, bindPath: string): unknown {
  const b = merged.blocks[blockId];
  if (!b) return undefined;
  return readTemplateFieldOnly(b, bindPath);
}

const INTERPOLATION_TOKEN_RE = (slotId: string) =>
  new RegExp(`\\{\\{\\s*${slotId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\}\\}`, "g");

function readVariableValueForBinding(spec: BindingSpec, payload: EmailPayload): unknown {
  const raw = payload.values[spec.slotId];
  if (raw === undefined) return spec.defaultValue;
  if (!spec.slotPath) return raw;
  return getAtPath(raw as Record<string, unknown>, spec.slotPath);
}

function templateReferencesSlot(template: EmailTemplate, slotId: string): boolean {
  for (const block of Object.values(template.blocks)) {
    for (const spec of Object.values(block.bindings ?? {})) {
      if (spec.mode === "variable" && spec.allowExternal === true && spec.slotId === slotId) return true;
      if (spec.mode === "interpolate" && spec.interpolationSlots?.some((slot) => slot.slotId === slotId)) {
        return true;
      }
    }
  }
  return false;
}

export function isVariableSlotDetached(payload: EmailPayload, slotId: string): boolean {
  return Boolean(payload.detachedVariableSlotIds?.includes(slotId));
}

export function detachVariableSlot(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  bindPath: string,
  merged: EmailTemplate
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  const spec = block?.bindings?.[bindPath];
  if (!spec || spec.mode !== "variable" || spec.allowExternal !== true) {
    return { template, payload };
  }
  const slotId = spec.slotId;
  if (payload.detachedVariableSlotIds?.includes(slotId)) return { template, payload };

  const p = structuredClone(payload);
  const ids = new Set(p.detachedVariableSlotIds ?? []);
  ids.add(slotId);
  p.detachedVariableSlotIds = [...ids];

  const baked = readMergedField(merged, blockId, bindPath);
  const fallback = readTemplateFieldOnly(block, bindPath);
  const t = setTemplateFieldOnly(template, blockId, bindPath, baked === undefined ? fallback : baked);
  return { template: t, payload: p };
}

export function restoreVariableSlot(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  bindPath: string
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  const spec = block?.bindings?.[bindPath];
  if (!spec || spec.mode !== "variable" || spec.allowExternal !== true) {
    return { template, payload };
  }
  const slotId = spec.slotId;
  if (!payload.detachedVariableSlotIds?.includes(slotId)) return { template, payload };

  const p = structuredClone(payload);
  p.detachedVariableSlotIds = (p.detachedVariableSlotIds ?? []).filter((id) => id !== slotId);
  if (p.detachedVariableSlotIds.length === 0) delete p.detachedVariableSlotIds;

  return { template, payload: p };
}

export function applyVariableBinding(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  bindPath: string,
  spec: BindingSpec,
  seedValue?: unknown
): { template: EmailTemplate; payload: EmailPayload } {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b) return { template, payload };
  if (!b.bindings) b.bindings = {};
  const previousSpec = b.bindings[bindPath];
  b.bindings[bindPath] = spec;

  const p = structuredClone(payload);
  if (spec.allowExternal === true && spec.valueType && !p.slots[spec.slotId]) {
    p.slots = {
      ...p.slots,
      [spec.slotId]: {
        label: spec.label?.trim() || spec.slotId,
        valueType: spec.valueType,
        description: spec.description,
        itemFields: spec.itemFields,
        minItems: spec.minItems,
        maxItems: spec.maxItems,
      },
    };
  }
  if (spec.allowExternal === true && spec.valueType !== "collection" && spec.slotPath === undefined) {
    const value =
      seedValue !== undefined
        ? seedValue
        : readTemplateFieldOnly(template.blocks[blockId]!, bindPath);
    const shouldSeedScalar =
      p.values[spec.slotId] === undefined &&
      ((typeof value === "string" && value !== "") ||
        (spec.valueType === "number" && typeof value === "number" && Number.isFinite(value)));
    if (shouldSeedScalar) {
      p.values = { ...p.values, [spec.slotId]: value };
    }
  }
  const detachedToClear = new Set([spec.slotId, previousSpec?.slotId].filter((id): id is string => Boolean(id)));
  p.detachedVariableSlotIds = (p.detachedVariableSlotIds ?? []).filter((id) => !detachedToClear.has(id));
  if (p.detachedVariableSlotIds.length === 0) delete p.detachedVariableSlotIds;
  if (
    previousSpec?.slotId &&
    previousSpec.slotId !== spec.slotId &&
    !templateReferencesSlot(t, previousSpec.slotId)
  ) {
    delete p.values[previousSpec.slotId];
  }
  return { template: t, payload: p };
}

export function detachInlineVariableBinding(
  template: EmailTemplate,
  blockId: string,
  bindPath: string,
  merged: EmailTemplate
): EmailTemplate {
  const block = template.blocks[blockId];
  const spec = block?.bindings?.[bindPath];
  if (!block || spec?.mode !== "interpolate") return template;

  const baked = readMergedField(merged, blockId, bindPath);
  const fallback = readTemplateFieldOnly(block, bindPath);
  const t = setTemplateFieldOnly(template, blockId, bindPath, baked === undefined ? fallback : baked);
  const next = structuredClone(t);
  const nextBlock = next.blocks[blockId];
  if (nextBlock?.bindings) {
    delete nextBlock.bindings[bindPath];
    if (Object.keys(nextBlock.bindings).length === 0) delete nextBlock.bindings;
  }
  return next;
}

export function removeExternalVariableSlot(
  template: EmailTemplate,
  payload: EmailPayload,
  slotId: string
): { template: EmailTemplate; payload: EmailPayload } {
  const t = structuredClone(template);
  const p = structuredClone(payload);

  for (const block of Object.values(t.blocks)) {
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries({ ...block.bindings })) {
      if (spec.mode === "variable" && spec.slotId === slotId) {
        const baked = readVariableValueForBinding(spec, payload);
        if (baked !== undefined && spec.slotPath === undefined) {
          const [root, ...rest] = bindPath.split(".");
          const subPath = rest.join(".");
          if (root === "props" && subPath) {
            setAtPath(block.props as Record<string, unknown>, subPath, baked);
          } else if (root === "wrapperStyle" && subPath) {
            if (!block.wrapperStyle) block.wrapperStyle = {};
            setAtPath(block.wrapperStyle as Record<string, unknown>, subPath, baked);
          }
        }
        delete block.bindings[bindPath];
        continue;
      }

      if (spec.mode === "interpolate" && spec.interpolationSlots?.some((slot) => slot.slotId === slotId)) {
        const slot = spec.interpolationSlots.find((item) => item.slotId === slotId);
        const replacement =
          typeof p.values[slotId] === "string"
            ? p.values[slotId]
            : typeof slot?.defaultValue === "string"
              ? slot.defaultValue
              : "";
        const [root, ...rest] = bindPath.split(".");
        const subPath = rest.join(".");
        const target =
          root === "props"
            ? getAtPath(block.props as Record<string, unknown>, subPath)
            : root === "wrapperStyle"
              ? getAtPath((block.wrapperStyle ?? {}) as Record<string, unknown>, subPath)
              : undefined;
        if (typeof target === "string") {
          const nextValue = target.replace(INTERPOLATION_TOKEN_RE(slotId), replacement);
          if (root === "props") setAtPath(block.props as Record<string, unknown>, subPath, nextValue);
          else if (root === "wrapperStyle" && block.wrapperStyle) {
            setAtPath(block.wrapperStyle as Record<string, unknown>, subPath, nextValue);
          }
        }
        const remainingSlots = spec.interpolationSlots.filter((item) => item.slotId !== slotId);
        if (remainingSlots.length === 0) {
          delete block.bindings[bindPath];
        } else {
          block.bindings[bindPath] = { ...spec, interpolationSlots: remainingSlots };
        }
      }
    }
    if (block.bindings && Object.keys(block.bindings).length === 0) delete block.bindings;
  }

  delete p.values[slotId];
  if (p.slots[slotId]) {
    const nextSlots = { ...p.slots };
    delete nextSlots[slotId];
    p.slots = nextSlots;
  }
  p.detachedVariableSlotIds = (p.detachedVariableSlotIds ?? []).filter((id) => id !== slotId);
  if (p.detachedVariableSlotIds.length === 0) delete p.detachedVariableSlotIds;

  return { template: t, payload: p };
}

export function variableBindingSpec(
  block: EmailBlock,
  bindPath: string
): { slotId: string; mode: "variable" | "interpolate"; detachable: boolean } | null {
  const spec = block.bindings?.[bindPath];
  if (!spec) return null;
  if (spec.mode === "variable" && spec.allowExternal === true) {
    return { slotId: spec.slotId, mode: "variable", detachable: true };
  }
  if (spec.mode === "interpolate") {
    return { slotId: spec.slotId, mode: "interpolate", detachable: false };
  }
  return null;
}
