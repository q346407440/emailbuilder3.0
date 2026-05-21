import type { BindingCollectionField, BindingSpec, EmailTemplate } from "../types/email";
import { findCollectionFieldByPath } from "./collection-item-fields";

/** collection 绑定若带数字下标 slotPath，表示读取列表某项的 itemField（列表重复行模板内） */
export function collectionBindingUsesItemIndex(slotPath: string | undefined): boolean {
  if (!slotPath?.trim()) return false;
  const head = slotPath.split(".")[0] ?? "";
  return /^\d+$/.test(head);
}

/** 去掉 slotPath Leading「0.」类数组下标，得到 itemField.key */
export function stripLeadingCollectionIndex(slotPath: string): string {
  const parts = slotPath.split(".");
  if (/^\d+$/.test(parts[0] ?? "")) {
    return parts.slice(1).join(".");
  }
  return slotPath;
}

function isDescendantOfBlock(template: EmailTemplate, blockId: string, ancestorId: string): boolean {
  let currentId: string | null = blockId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    currentId = template.blocks[currentId]?.parentId ?? null;
  }
  return false;
}

/** 在模板中查找某 collection 槽的 itemFields（同块绑定、repeat 宿主或任意绑定声明） */
export function findCollectionItemFieldsInTemplate(
  template: EmailTemplate,
  slotId: string,
  preferBlockId?: string
): BindingCollectionField[] | undefined {
  if (preferBlockId) {
    const preferred = template.blocks[preferBlockId];
    const fromPreferred = collectItemFieldsFromBlock(preferred, slotId);
    if (fromPreferred?.length) return fromPreferred;
  }

  for (const block of Object.values(template.blocks)) {
    const fields = collectItemFieldsFromBlock(block, slotId);
    if (fields?.length) return fields;
  }

  return undefined;
}

function collectItemFieldsFromBlock(
  block: EmailTemplate["blocks"][string] | undefined,
  slotId: string
): BindingCollectionField[] | undefined {
  if (!block) return undefined;
  if (block.repeat?.mode === "collection" && block.repeat.slotId === slotId) {
    return block.repeat.itemFields?.length ? block.repeat.itemFields : undefined;
  }
  if (!block.bindings) return undefined;
  for (const spec of Object.values(block.bindings)) {
    if (
      spec.mode === "variable" &&
      spec.allowExternal === true &&
      spec.slotId === slotId &&
      spec.itemFields?.length
    ) {
      return spec.itemFields;
    }
  }
  return undefined;
}

/** 行模板内绑定：从 repeat 宿主取与 slotId 一致的 itemFields */
function resolveRepeatHostItemFieldsForSlot(
  template: EmailTemplate,
  blockId: string,
  slotId: string
): BindingCollectionField[] | undefined {
  let hostId: string | null = template.blocks[blockId]?.parentId ?? null;
  while (hostId) {
    const host = template.blocks[hostId];
    const repeat = host?.repeat;
    if (
      repeat?.mode === "collection" &&
      repeat.slotId === slotId &&
      (host?.type === "layout" || host?.type === "grid")
    ) {
      const inPrototype = repeat.prototypeChildIds.some((pid) =>
        isDescendantOfBlock(template, blockId, pid)
      );
      if (inPrototype && hostId !== blockId) {
        return repeat.itemFields;
      }
    }
    hostId = host?.parentId ?? null;
  }
  return undefined;
}

/**
 * 变量绑定用于兼容校验的有效槽类型。
 * - 普通 variable：即 spec.valueType
 * - 列表重复行内字段（valueType=collection + slotPath 如 0.title）：取 itemFields 中对应项字段类型
 */
export function resolveEffectiveBindingSlotValueType(
  spec: Pick<BindingSpec, "valueType" | "slotPath" | "itemFields" | "slotId">,
  context?: { template: EmailTemplate; blockId: string }
): string {
  const declared = spec.valueType ?? "string";
  if (declared !== "collection" || !collectionBindingUsesItemIndex(spec.slotPath)) {
    return declared;
  }

  const itemFieldKey = stripLeadingCollectionIndex(spec.slotPath!.trim());
  if (!itemFieldKey) return declared;

  const fields =
    spec.itemFields?.length
      ? spec.itemFields
      : context?.template
        ? (context.blockId
            ? resolveRepeatHostItemFieldsForSlot(context.template, context.blockId, spec.slotId)
            : undefined) ??
          findCollectionItemFieldsInTemplate(context.template, spec.slotId, context.blockId)
        : undefined;

  const meta = findCollectionFieldByPath(fields, itemFieldKey);
  return meta?.valueType ?? declared;
}
