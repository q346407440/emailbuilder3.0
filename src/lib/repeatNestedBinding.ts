import type {
  BindingCollectionField,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  RepeatRegionBinding,
} from "../types/email";
import { isCollectionField } from "../payload-contract/collection-item-fields";
import { normalizeTemplateBeforeUnifiedRepeatBinding } from "./repeatMaterializedNormalize";
import {
  applyRepeatRegionBinding,
  isRepeatHostBlock,
  removeRepeatRegionBinding,
  type RepeatUnbindOptions,
} from "./repeatRegion";

/** 列表重复循环范围（通用父级/子级文案） */
export type RepeatLoopScope = "parentOnly" | "parentAndChild" | "childOnly";

export type NestedCollectionFieldOption = {
  path: string;
  label: string;
  itemFields: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
};


export type UnifiedRepeatBindPlan = {
  scope: RepeatLoopScope;
  slotId: string;
  parentHostId: string;
  parentPrototypeChildIds: string[];
  parentItemFields: BindingCollectionField[];
  parentFieldMappings: RepeatFieldMapping[];
  parentLabel?: string;
  parentDescription?: string;
  parentMinItems?: number;
  parentMaxItems?: number;
  childItemPath?: string;
  childHostId?: string;
  childPrototypeChildIds?: string[];
  childItemFields?: BindingCollectionField[];
  childFieldMappings?: RepeatFieldMapping[];
  childLabel?: string;
  childDescription?: string;
  childMinItems?: number;
  childMaxItems?: number;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function collectSubtreeBlockIds(template: EmailTemplate, rootIds: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const visit = (blockId: string) => {
    if (seen.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    seen.add(blockId);
    ids.push(blockId);
    block.children.forEach(visit);
  };
  rootIds.forEach(visit);
  return ids;
}

/** 父级 itemFields 中的子列表列（collection 类型） */
export function listNestedCollectionFields(
  itemFields: BindingCollectionField[]
): NestedCollectionFieldOption[] {
  return itemFields.filter(isCollectionField).map((field) => ({
    path: field.key,
    label: field.label?.trim() || field.key,
    itemFields: field.itemFields ?? [],
    minItems: field.minItems,
    maxItems: field.maxItems,
  }));
}

function clearRepeatsInSubtree(template: EmailTemplate, rootIds: string[]): EmailTemplate {
  let next = template;
  const rootIdSet = new Set(rootIds);
  for (const blockId of collectSubtreeBlockIds(template, rootIds)) {
    // 行模板根自身可带 repeat（含 self-repeat 宿主=原型）；只清子树内嵌套 repeat
    if (rootIdSet.has(blockId)) continue;
    const block = next.blocks[blockId];
    if (!block?.repeat) continue;
    const cleared = clone(next);
    delete cleared.blocks[blockId]!.repeat;
    next = cleared;
  }
  return next;
}

/** 单层列表绑定：把 repeat 写到选中容器自身（prototypeChildIds=[hostId]）。 */
export type SingleLevelRepeatBindSpec = {
  hostId: string;
  slotId: string;
  itemFields: BindingCollectionField[];
  /** 绑定父项子列表时的相对路径；绑定独立顶层变量时为空 */
  itemPath?: string;
  itemMode?: RepeatRegionBinding["itemMode"];
  groupSize?: number;
  fieldMappings: RepeatFieldMapping[];
  minItems?: number;
  maxItems?: number;
  label?: string;
  description?: string;
};

/**
 * 应用单层列表重复：绑哪个容器就复制哪个容器（self-repeat）。
 * - 重绑前先归一化父宿主的物化行（unbind→rebind 往返）。
 * - **不**清除子树内已有的独立子级 repeat（增量嵌套，各层正交）。
 */
export function applySingleLevelRepeatBinding(
  template: EmailTemplate,
  spec: SingleLevelRepeatBindSpec,
  payload: EmailPayload | null = null
): EmailTemplate {
  void payload;
  const plan: UnifiedRepeatBindPlan = {
    scope: "parentOnly",
    slotId: spec.slotId,
    parentHostId: spec.hostId,
    parentPrototypeChildIds: [spec.hostId],
    parentItemFields: spec.itemFields,
    parentFieldMappings: spec.fieldMappings,
    parentMinItems: spec.minItems,
    parentMaxItems: spec.maxItems,
    parentLabel: spec.label,
    parentDescription: spec.description,
  };
  const { template: normalized } = normalizeTemplateBeforeUnifiedRepeatBinding(
    template,
    plan,
    template
  );
  const host = normalized.blocks[spec.hostId];
  if (!host || !isRepeatHostBlock(host)) {
    throw new Error("列表重复只能绑定在布局容器、栅格或图片区块上。");
  }
  if (host.objectBind?.mode === "object") {
    delete host.objectBind;
  }
  const itemPath = spec.itemPath?.trim() ? spec.itemPath.trim() : undefined;
  return applyRepeatRegionBinding(normalized, spec.hostId, {
    slotId: spec.slotId,
    prototypeChildIds: [spec.hostId],
    itemFields: spec.itemFields,
    itemPath,
    itemMode: spec.itemMode,
    groupSize: spec.groupSize,
    fieldMappings: spec.fieldMappings,
    minItems: spec.minItems,
    maxItems: spec.maxItems,
    label: spec.label,
    description: spec.description,
  });
}

/**
 * 解除父级宿主绑定，并清除物化后整棵子树内的 repeat。
 * 父级物化后行模板原型 id 已从 blocks 移除，须在 host.children（物化根）上清理子级 repeat。
 */
export function removeUnifiedRepeatBinding(
  template: EmailTemplate,
  parentHostId: string,
  payload: EmailPayload | null,
  options?: RepeatUnbindOptions
): EmailTemplate {
  const mode = options?.mode ?? "materializeRows";
  let next = removeRepeatRegionBinding(template, parentHostId, payload, { mode });
  if (mode === "keepPrototypeOnly") {
    const prototypeRoots = next.blocks[parentHostId]?.children ?? [];
    if (prototypeRoots.length > 0) {
      next = clearRepeatsInSubtree(next, prototypeRoots);
    }
    return next;
  }
  const materializedRoots = next.blocks[parentHostId]?.children ?? [];
  if (materializedRoots.length > 0) {
    next = clearRepeatsInSubtree(next, materializedRoots);
  }
  return next;
}

