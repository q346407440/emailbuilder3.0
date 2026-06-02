import type { BindingCollectionField, BindingSpec, EmailPayload, EmailTemplate, RepeatRegionBinding } from "../types/email";
import type { ExternalSlotDefinition } from "./types";
import { isSlotValueType } from "./value-types";

/** 从 payload.slots 构建校验用注册表（变量目录唯一真源） */
export function buildPayloadSlotRegistry(
  payload: EmailPayload
): Map<string, ExternalSlotDefinition> {
  const registry = new Map<string, ExternalSlotDefinition>();
  for (const [slotId, def] of Object.entries(payload.slots ?? {})) {
    if (!def || typeof def !== "object") continue;
    const valueType = def.valueType;
    if (!isSlotValueType(valueType)) continue;
    registry.set(slotId, {
      slotId,
      valueType,
      label: def.label,
      description: def.description,
      itemFields: def.itemFields,
      minItems: def.minItems,
      maxItems: def.maxItems,
      dataSource: def.dataSource,
    });
  }
  return registry;
}

function mergeSlotDefinition(
  existing: ExternalSlotDefinition | undefined,
  spec: BindingSpec
): ExternalSlotDefinition | null {
  const valueType = spec.valueType;
  if (!isSlotValueType(valueType)) return null;
  const slotId = spec.slotId;
  if (!existing) {
    return {
      slotId,
      valueType,
      itemFields: spec.itemFields,
      minItems: spec.minItems,
      maxItems: spec.maxItems,
      label: spec.label,
      description: spec.description,
    };
  }
  if (existing.valueType !== valueType) {
    return null;
  }
  return {
    ...existing,
    itemFields: existing.itemFields ?? spec.itemFields,
    minItems: existing.minItems ?? spec.minItems,
    maxItems: existing.maxItems ?? spec.maxItems,
    label: existing.label ?? spec.label,
    description: existing.description ?? spec.description,
  };
}

function repeatToSlotDefinition(repeat: RepeatRegionBinding): ExternalSlotDefinition {
  return {
    slotId: repeat.slotId,
    valueType: "collection",
    itemFields: repeat.itemFields,
    minItems: repeat.minItems,
    maxItems: repeat.maxItems,
    label: repeat.label,
    description: repeat.description,
  };
}

/** 多版式场景：合并各 template 的外部槽注册表（同 slotId 取先出现的定义） */
export function buildUnionExternalSlotRegistry(
  templates: EmailTemplate[]
): Map<string, ExternalSlotDefinition> {
  const union = new Map<string, ExternalSlotDefinition>();
  for (const template of templates) {
    for (const [slotId, def] of buildExternalSlotRegistry(template)) {
      if (!union.has(slotId)) union.set(slotId, def);
    }
  }
  return union;
}

/** 扫描 template，得到所有 variable + allowExternal 槽（按 slotId 合并） */
export function buildExternalSlotRegistry(
  template: EmailTemplate
): Map<string, ExternalSlotDefinition> {
  const registry = new Map<string, ExternalSlotDefinition>();
  for (const block of Object.values(template.blocks)) {
    if (block.repeat?.mode === "collection") {
      const repeatSlot = repeatToSlotDefinition(block.repeat);
      const existing = registry.get(repeatSlot.slotId);
      if (!existing) {
        registry.set(repeatSlot.slotId, repeatSlot);
      } else if (existing.valueType === "collection") {
        registry.set(repeatSlot.slotId, {
          ...existing,
          itemFields: existing.itemFields ?? repeatSlot.itemFields,
          minItems: existing.minItems ?? repeatSlot.minItems,
          maxItems: existing.maxItems ?? repeatSlot.maxItems,
          label: existing.label ?? repeatSlot.label,
          description: existing.description ?? repeatSlot.description,
        });
      }
    }
    if (block.visibility) {
      const merged = mergeSlotDefinition(registry.get(block.visibility.slotId), {
        slotId: block.visibility.slotId,
        mode: "variable",
        valueType: block.visibility.valueType,
        allowExternal: true,
        itemFields: block.visibility.itemFields as BindingCollectionField[] | undefined,
        minItems: block.visibility.minItems,
        maxItems: block.visibility.maxItems,
        label: block.visibility.label,
        description: block.visibility.description,
      });
      if (merged) registry.set(block.visibility.slotId, merged);
    }
    if (!block.bindings) continue;
    for (const spec of Object.values(block.bindings)) {
      if (spec.mode === "variable" && spec.allowExternal === true) {
        const merged = mergeSlotDefinition(registry.get(spec.slotId), spec);
        if (merged) registry.set(spec.slotId, merged);
        continue;
      }
      if (spec.mode === "interpolate") {
        for (const slot of spec.interpolationSlots ?? []) {
          if (slot.allowExternal !== true) continue;
          const merged = mergeSlotDefinition(registry.get(slot.slotId), {
            slotId: slot.slotId,
            mode: "variable",
            valueType: slot.valueType,
            defaultValue: slot.defaultValue,
            allowExternal: true,
            label: slot.label,
            description: slot.description,
          });
          if (merged) registry.set(slot.slotId, merged);
        }
      }
    }
  }
  return registry;
}
