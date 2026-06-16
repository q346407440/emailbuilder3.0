import type {
  BindingSpec,
  EmailBlock,
  EmailTemplate,
  ObjectRegionBinding,
  RepeatFieldMapping,
} from "../types/email";
import { findObjectFieldByPath } from "../payload-contract/object-fields";
import { isRepeatHostBlock } from "./repeatHostBlock";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export { isRepeatHostBlock as isObjectHostBlock } from "./repeatHostBlock";

export function objectFieldMappingSpec(
  objectBind: ObjectRegionBinding,
  mapping: RepeatFieldMapping
): BindingSpec {
  const field = findObjectFieldByPath(objectBind.objectFields, mapping.sourcePath);
  return {
    slotId: objectBind.slotId,
    mode: "variable",
    allowExternal: true,
    valueType: (field?.valueType ?? mapping.valueType ?? "string") as BindingSpec["valueType"],
    slotPath: mapping.sourcePath,
    label: mapping.label ?? objectBind.label,
    description: objectBind.description,
  };
}

/** 将各宿主 objectBind.fieldMappings 物化为目标 block.bindings（预览/merge 前调用，不落盘）。 */
export function applyObjectBindMappingsToTemplate(template: EmailTemplate): EmailTemplate {
  const next = clone(template);
  for (const block of Object.values(next.blocks)) {
    const objectBind = block.objectBind;
    if (objectBind?.mode !== "object") continue;
    for (const mapping of objectBind.fieldMappings ?? []) {
      const target = next.blocks[mapping.targetBlockId];
      if (!target) continue;
      target.bindings = { ...(target.bindings ?? {}) };
      target.bindings[mapping.targetBindPath] = objectFieldMappingSpec(objectBind, mapping);
    }
  }
  return next;
}

export type ObjectRegionBindSpec = {
  hostId: string;
  slotId: string;
  objectFields: ObjectRegionBinding["objectFields"];
  fieldMappings: RepeatFieldMapping[];
  label?: string;
  description?: string;
};

export function applyObjectRegionBinding(
  template: EmailTemplate,
  spec: ObjectRegionBindSpec
): EmailTemplate {
  const next = clone(template);
  const host = next.blocks[spec.hostId];
  if (!host || !isRepeatHostBlock(host)) {
    throw new Error("对象绑定只能配置在布局容器、栅格或图片区块上。");
  }
  if (host.repeat?.mode === "collection") {
    delete host.repeat;
  }
  host.objectBind = {
    mode: "object",
    slotId: spec.slotId,
    objectFields: spec.objectFields,
    fieldMappings: spec.fieldMappings,
    label: spec.label,
    description: spec.description,
  };
  return next;
}

export function removeObjectRegionBinding(template: EmailTemplate, hostId: string): EmailTemplate {
  const next = clone(template);
  const host = next.blocks[hostId];
  if (!host?.objectBind) return template;
  delete host.objectBind;
  return next;
}

/** 目标字段是否由祖先 objectBind.fieldMappings 驱动（只读） */
export function isObjectBindMappedField(
  template: EmailTemplate,
  blockId: string,
  bindPath: string
): boolean {
  let currentId: string | null = blockId;
  while (currentId) {
    const block: EmailBlock | undefined = template.blocks[currentId];
    const objectBind = block?.objectBind;
    if (objectBind?.mode === "object") {
      return (objectBind.fieldMappings ?? []).some(
        (mapping) => mapping.targetBlockId === blockId && mapping.targetBindPath === bindPath
      );
    }
    currentId = block?.parentId ?? null;
  }
  return false;
}

export function resolveObjectBindOnHost(
  template: EmailTemplate,
  hostId: string
): ObjectRegionBinding | null {
  const host = template.blocks[hostId];
  return host?.objectBind?.mode === "object" ? host.objectBind : null;
}
