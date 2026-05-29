import type {
  BindingCollectionField,
  BindingSpec,
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  RepeatRegionBinding,
} from "../types/email";
import {
  findCollectionFieldByPath,
  isCollectionField,
} from "../payload-contract/collection-item-fields";
import { collectionBindingUsesItemIndex } from "../payload-contract/repeat-list-item-binding";
import { normalizeTemplateBeforeUnifiedRepeatBinding } from "./repeatMaterializedNormalize";
import {
  applyRepeatRegionBinding,
  buildRepeatPrototypeIdSet,
  isMaterializedRepeatRowBlockId,
  isRepeatHostBlock,
  parseMaterializedRepeatRowBlockId,
  removeRepeatRegionBinding,
} from "./repeatRegion";
import { sanitizeListRepeatUserLabel } from "./repeatNestedBindingUi";

/** 列表重复循环范围（通用父级/子级文案） */
export type RepeatLoopScope = "parentOnly" | "parentAndChild" | "childOnly";

export type NestedCollectionFieldOption = {
  path: string;
  label: string;
  itemFields: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
};

export type ChildRepeatHostOption = {
  hostId: string;
  label: string;
  prototypeOptions: Array<{ prototypeChildIds: string[]; label: string }>;
};

/** 子级合一绑定：行模板选项（每项同时确定循环容器 hostId + 复制范围） */
export type ChildRepeatPrototypeOption = {
  key: string;
  hostId: string;
  prototypeChildIds: string[];
  label: string;
  /** 行模板复制方式（树表「说明」列） */
  modeLabel: string;
  description: string;
};

export type ChildRepeatPrototypePickerRow =
  | {
      kind: "context";
      rowKey: string;
      depth: number;
      blockId: string;
      label: string;
      typeLabel: string;
    }
  | {
      /** 区块树中的结构行（不可选，仅展示层级） */
      kind: "block";
      rowKey: string;
      depth: number;
      blockId: string;
      label: string;
      typeLabel: string;
      branchKey: string;
      expandable: boolean;
    }
  | {
      kind: "choice";
      rowKey: string;
      depth: number;
      blockId: string;
      optionKey: string;
      label: string;
      typeLabel: string;
      hostLabel: string;
      modeLabel: string;
      description: string;
      branchKey?: string;
      expandable?: boolean;
    };

function repeatPrototypePickerBranchKey(blockId: string): string {
  return `block:${blockId}`;
}

export function childRepeatPrototypeOptionKey(
  hostId: string,
  prototypeChildIds: string[]
): string {
  return `${hostId}:${prototypeChildIds.join("+")}`;
}

function repeatPrototypeChildIdsEqual(
  a: readonly string[],
  b: readonly string[]
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** 子级行模板是否与父级已选行模板为同一份绑定（子级步骤中须置灰不可选） */
export function isChildRepeatPrototypeReservedByParent(
  child: { key: string; hostId: string; prototypeChildIds: readonly string[] },
  parent: { key: string; hostId: string; prototypeChildIds: readonly string[] } | null | undefined
): boolean {
  if (!parent) return false;
  if (child.key === parent.key) return true;
  if (
    child.hostId === parent.hostId &&
    repeatPrototypeChildIdsEqual(child.prototypeChildIds, parent.prototypeChildIds)
  ) {
    return true;
  }
  if (repeatPrototypeChildIdsEqual(child.prototypeChildIds, parent.prototypeChildIds)) {
    return true;
  }
  return false;
}

/** 子级行模板树表中因父级已占用而须禁用的 optionKey 集合 */
export function childRepeatPrototypeDisabledKeysForParent(
  parent: { key: string; hostId: string; prototypeChildIds: readonly string[] } | null | undefined,
  childOptions: ReadonlyArray<{ key: string; hostId: string; prototypeChildIds: readonly string[] }>
): Set<string> {
  const disabled = new Set<string>();
  if (!parent) return disabled;
  for (const opt of childOptions) {
    if (isChildRepeatPrototypeReservedByParent(opt, parent)) {
      disabled.add(opt.key);
    }
  }
  return disabled;
}

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
  anchorItemIndex?: number;
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

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  const raw = template.blockMeta?.[blockId]?.name?.trim() || blockId;
  return sanitizeListRepeatUserLabel(raw);
}

function emailBlockTypeLabel(type: EmailBlock["type"] | undefined): string {
  switch (type) {
    case "layout":
      return "Layout";
    case "grid":
      return "Grid";
    case "text":
      return "文本";
    case "image":
      return "图片";
    case "button":
      return "按钮";
    case "divider":
      return "分割线";
    case "progress":
      return "进度";
    case "icon":
      return "图标";
    case "emailRoot":
      return "邮件根";
    default:
      return type ?? "区块";
  }
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

/** 子级绑定向导：禁止选物化 SKU 副本行或非 layout/grid 宿主（应用层与 resolveChildRepeatBindTargets 对齐） */
export function isDisallowedChildRepeatPrototypeOption(
  template: EmailTemplate,
  hostId: string,
  prototypeChildIds: readonly string[]
): boolean {
  const host = template.blocks[hostId];
  if (!host || !isRepeatHostBlock(host)) return true;

  const prototypeSet = buildRepeatPrototypeIdSet(template);
  for (const protoId of prototypeChildIds) {
    const proto = template.blocks[protoId];
    if (!proto) return true;
    if (isRepeatHostBlock(proto)) continue;
    if (!isMaterializedRepeatRowBlockId(protoId, template)) continue;
    const parsed = parseMaterializedRepeatRowBlockId(protoId, prototypeSet, template);
    if (parsed && parsed.itemIndex > 0) return true;
  }
  return false;
}

/**
 * 父级行模板子树内的子级行模板选项（与 Inspector 父级行模板逻辑对齐：
 * 选单块 → 仅复制该块；选 layout/grid → 复制该容器及其子级）。
 */
export function listChildRepeatPrototypeOptions(
  template: EmailTemplate,
  parentPrototypeChildIds: string[]
): ChildRepeatPrototypeOption[] {
  const subtreeIds = new Set(collectSubtreeBlockIds(template, parentPrototypeChildIds));
  const options: ChildRepeatPrototypeOption[] = [];
  const seen = new Set<string>();

  const push = (entry: Omit<ChildRepeatPrototypeOption, "key">) => {
    if (isDisallowedChildRepeatPrototypeOption(template, entry.hostId, entry.prototypeChildIds)) {
      return;
    }
    const key = childRepeatPrototypeOptionKey(entry.hostId, entry.prototypeChildIds);
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ ...entry, key });
  };

  for (const blockId of subtreeIds) {
    const block = template.blocks[blockId];
    if (!block || !isRepeatHostBlock(block)) continue;
    for (const childId of block.children) {
      if (!subtreeIds.has(childId) || !template.blocks[childId]) continue;
      const child = template.blocks[childId]!;
      const childName = blockDisplayName(template, childId);
      if (isRepeatHostBlock(child)) {
        push({
          hostId: blockId,
          prototypeChildIds: [childId],
          label: `${childName}（连同子级一起复制）`,
          modeLabel: "连同子级一起复制",
          description: "子级列表写在本容器上，每行复制该 layout/grid 及其内部区块。",
        });
      } else {
        push({
          hostId: blockId,
          prototypeChildIds: [childId],
          label: `${childName}（子级行模板）`,
          modeLabel: "仅复制本区块",
          description: "子级列表写在本容器上，每行仅复制该区块。",
        });
      }
    }
  }

  for (const blockId of subtreeIds) {
    const block = template.blocks[blockId];
    if (!block || isRepeatHostBlock(block)) continue;
    const parentId = block.parentId;
    if (!parentId || !subtreeIds.has(parentId)) continue;
    const parent = template.blocks[parentId];
    if (!parent || !isRepeatHostBlock(parent)) continue;
    push({
      hostId: parentId,
      prototypeChildIds: [blockId],
      label: `${blockDisplayName(template, blockId)}（仅复制当前区块）`,
      modeLabel: "仅复制当前区块",
      description: "子级列表写在父级 layout/grid 上，每行仅复制当前区块。",
    });
  }

  for (const blockId of subtreeIds) {
    const block = template.blocks[blockId];
    if (!block || !isRepeatHostBlock(block)) continue;
    const parentId = block.parentId;
    if (!parentId || !subtreeIds.has(parentId)) continue;
    const parent = template.blocks[parentId];
    if (!parent || !isRepeatHostBlock(parent)) continue;
    const grandParentId = parent.parentId;
    if (!grandParentId || !subtreeIds.has(grandParentId)) continue;
    const grandParent = template.blocks[grandParentId];
    if (!grandParent || !isRepeatHostBlock(grandParent)) continue;
    push({
      hostId: grandParentId,
      prototypeChildIds: [parentId],
      label: `${blockDisplayName(template, parentId)}（连同父容器一起复制）`,
      modeLabel: "连同父容器一起复制",
      description: "子级列表写在祖父级 layout/grid 上，每行复制该容器及其内部区块。",
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
}

/** 行模板树表：按 block 子树 DFS 展示层级，可选行带单选（父级/子级合一绑定弹窗共用） */
export function flattenRepeatPrototypePickerRows(
  template: EmailTemplate,
  contextRootIds: string[],
  contextLabelSuffix: string,
  options: ChildRepeatPrototypeOption[]
): ChildRepeatPrototypePickerRow[] {
  const subtreeIds = new Set(collectSubtreeBlockIds(template, contextRootIds));
  const choicesByBlock = new Map<string, ChildRepeatPrototypeOption[]>();
  for (const opt of options) {
    const anchor = opt.prototypeChildIds[opt.prototypeChildIds.length - 1] ?? "";
    if (!anchor) continue;
    const list = choicesByBlock.get(anchor) ?? [];
    list.push(opt);
    choicesByBlock.set(anchor, list);
  }

  const rows: ChildRepeatPrototypePickerRow[] = [];

  const visit = (blockId: string, depth: number) => {
    if (!subtreeIds.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    const choices = choicesByBlock.get(blockId) ?? [];
    const childIds = block.children.filter((id) => subtreeIds.has(id));
    const expandable = childIds.length > 0;
    const branchKey = repeatPrototypePickerBranchKey(blockId);

    if (choices.length === 0) {
      rows.push({
        kind: "block",
        rowKey: branchKey,
        depth,
        blockId,
        label: blockDisplayName(template, blockId),
        typeLabel: emailBlockTypeLabel(block.type),
        branchKey,
        expandable,
      });
    } else {
      choices.forEach((opt, index) => {
        rows.push({
          kind: "choice",
          rowKey: `choice:${opt.key}`,
          depth,
          blockId,
          optionKey: opt.key,
          label: blockDisplayName(template, blockId),
          typeLabel: emailBlockTypeLabel(block.type),
          hostLabel: blockDisplayName(template, opt.hostId),
          modeLabel: opt.modeLabel,
          description: opt.description,
          branchKey: expandable ? branchKey : undefined,
          expandable: expandable && index === 0,
        });
      });
    }

    for (const childId of childIds) visit(childId, depth + 1);
  };

  for (const rootId of contextRootIds) {
    if (!subtreeIds.has(rootId)) continue;
    const root = template.blocks[rootId];
    rows.push({
      kind: "context",
      rowKey: `context:${rootId}`,
      depth: 0,
      blockId: rootId,
      label: `${blockDisplayName(template, rootId)}（${contextLabelSuffix}）`,
      typeLabel: emailBlockTypeLabel(root?.type),
    });
    const starts =
      root && root.children.length > 0
        ? root.children.filter((id) => subtreeIds.has(id))
        : [rootId];
    for (const startId of starts) visit(startId, 1);
  }

  return rows;
}

/** 展开到指定区块所需沿路径的 branchKey（含各层父级） */
export function repeatPrototypePickerBranchKeysToBlock(
  template: EmailTemplate,
  contextRootIds: string[],
  targetBlockId: string
): string[] {
  const subtreeIds = new Set(collectSubtreeBlockIds(template, contextRootIds));
  if (!subtreeIds.has(targetBlockId)) return [];
  const keys: string[] = [];
  let current: string | null | undefined = targetBlockId;
  while (current && subtreeIds.has(current)) {
    const block = template.blocks[current];
    if (block?.children.some((id) => subtreeIds.has(id))) {
      keys.push(repeatPrototypePickerBranchKey(current));
    }
    current = block?.parentId;
  }
  return keys;
}

/** 子级行模板树表（上下文 = 父级行模板根） */
export function flattenChildRepeatPrototypePickerRows(
  template: EmailTemplate,
  parentPrototypeChildIds: string[],
  options: ChildRepeatPrototypeOption[]
): ChildRepeatPrototypePickerRow[] {
  return flattenRepeatPrototypePickerRows(template, parentPrototypeChildIds, "父级行模板", options);
}

/** 父级行模板树表（上下文 = 父级列表循环容器） */
export function flattenParentRepeatPrototypePickerRows(
  template: EmailTemplate,
  parentListHostId: string,
  options: ChildRepeatPrototypeOption[]
): ChildRepeatPrototypePickerRow[] {
  if (!parentListHostId.trim()) return [];
  return flattenRepeatPrototypePickerRows(
    template,
    [parentListHostId],
    "父级列表循环容器",
    options
  );
}

export function defaultExpandedRepeatPrototypePickerBranches(
  rows: ReadonlyArray<ChildRepeatPrototypePickerRow>,
  template?: EmailTemplate
): Set<string> {
  const materialized =
    template &&
    rows.some(
      (row) =>
        row.kind !== "context" && isMaterializedRepeatRowBlockId(row.blockId, template)
    );

  const keys = new Set<string>();
  if (!materialized) {
    for (const row of rows) {
      if (row.kind === "block" && row.expandable) keys.add(row.branchKey);
      if (row.kind === "choice" && row.branchKey) keys.add(row.branchKey);
    }
    return keys;
  }

  const prototypeSet = buildRepeatPrototypeIdSet(template);
  for (const row of rows) {
    if (row.kind === "choice" && row.branchKey) {
      const parsed = parseMaterializedRepeatRowBlockId(row.blockId, prototypeSet, template);
      if (!parsed || parsed.itemIndex === 0) keys.add(row.branchKey);
      continue;
    }
    if (row.kind === "block" && row.expandable) {
      const parsed = parseMaterializedRepeatRowBlockId(row.blockId, prototypeSet, template);
      if (!parsed && row.depth <= 2) keys.add(row.branchKey);
      else if (parsed && parsed.itemIndex === 0 && row.depth <= 2) keys.add(row.branchKey);
    }
  }
  return keys;
}

/** 子级行模板默认选项：优先 SKU 规格列表宿主（sku-strip），避免误选价格行 */
export function preferredChildRepeatPrototypeOptionKey(
  template: EmailTemplate,
  options: ReadonlyArray<ChildRepeatPrototypeOption>
): string | undefined {
  const skuStrip = options.find((opt) => {
    const anchor = opt.prototypeChildIds[opt.prototypeChildIds.length - 1] ?? "";
    if (/sku-strip/i.test(anchor)) return true;
    const name = template.blockMeta?.[anchor]?.name ?? "";
    return /SKU/i.test(name) && /列表|规格/.test(name);
  });
  return skuStrip?.key;
}

/** @deprecated 使用 defaultExpandedRepeatPrototypePickerBranches */
export const defaultExpandedChildRepeatPrototypeBranches = defaultExpandedRepeatPrototypePickerBranches;

function repeatPrototypePickerCollapseKey(
  row: ChildRepeatPrototypePickerRow
): string | undefined {
  if (row.kind === "block" && row.expandable) return row.branchKey;
  if (row.kind === "choice" && row.expandable && row.branchKey) return row.branchKey;
  return undefined;
}

export function visibleRepeatPrototypePickerRows(
  rows: ReadonlyArray<ChildRepeatPrototypePickerRow>,
  expandedBranchKeys: ReadonlySet<string>
): ChildRepeatPrototypePickerRow[] {
  const visible: ChildRepeatPrototypePickerRow[] = [];
  let hiddenBelowDepth: number | null = null;
  for (const row of rows) {
    if (hiddenBelowDepth !== null && row.depth > hiddenBelowDepth) continue;
    hiddenBelowDepth = null;
    visible.push(row);
    const collapseKey = repeatPrototypePickerCollapseKey(row);
    if (collapseKey && !expandedBranchKeys.has(collapseKey)) {
      hiddenBelowDepth = row.depth;
    }
  }
  return visible;
}

/** @deprecated 使用 visibleRepeatPrototypePickerRows */
export const visibleChildRepeatPrototypePickerRows = visibleRepeatPrototypePickerRows;

/** 按 hostId 聚合的子级循环容器选项（派生自 listChildRepeatPrototypeOptions） */
export function listChildRepeatHostOptions(
  template: EmailTemplate,
  parentPrototypeChildIds: string[]
): ChildRepeatHostOption[] {
  const byHost = new Map<string, ChildRepeatHostOption>();
  for (const option of listChildRepeatPrototypeOptions(template, parentPrototypeChildIds)) {
    let entry = byHost.get(option.hostId);
    if (!entry) {
      entry = {
        hostId: option.hostId,
        label: blockDisplayName(template, option.hostId),
        prototypeOptions: [],
      };
      byHost.set(option.hostId, entry);
    }
    entry.prototypeOptions.push({
      prototypeChildIds: option.prototypeChildIds,
      label: option.label,
    });
  }
  return [...byHost.values()];
}

/** 从已绑定的子级 repeat 还原行模板选项 key */
export function childRepeatPrototypeOptionKeyFromBinding(
  template: EmailTemplate,
  parentPrototypeChildIds: string[],
  childHostId: string,
  childPrototypeChildIds: string[]
): string | undefined {
  const key = childRepeatPrototypeOptionKey(childHostId, childPrototypeChildIds);
  const options = listChildRepeatPrototypeOptions(template, parentPrototypeChildIds);
  return options.find((option) => option.key === key)?.key;
}

function parentScalarItemFields(itemFields: BindingCollectionField[]): BindingCollectionField[] {
  return itemFields.filter((field) => !isCollectionField(field));
}

function countPayloadListItems(payload: EmailPayload, slotId: string): number {
  const raw = payload.values?.[slotId];
  if (!Array.isArray(raw)) return 0;
  return raw.filter((item) => item && typeof item === "object" && !Array.isArray(item)).length;
}

function countNestedListItems(
  payload: EmailPayload,
  slotId: string,
  itemPath: string,
  anchorItemIndex: number
): number {
  const raw = payload.values?.[slotId];
  if (!Array.isArray(raw) || raw.length === 0) return 0;
  const parent = raw[anchorItemIndex];
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return 0;
  const nested = (parent as Record<string, unknown>)[itemPath.split(".")[0] ?? ""];
  if (!Array.isArray(nested)) return 0;
  return nested.filter((item) => item && typeof item === "object" && !Array.isArray(item)).length;
}

function countNestedListItemsFromFirstParent(
  payload: EmailPayload,
  slotId: string,
  itemPath: string
): number {
  return countNestedListItems(payload, slotId, itemPath, 0);
}

/** 循环范围结果预览句（动态插入槽/子列表名称） */
export function formatRepeatBindScopePreview(
  scope: RepeatLoopScope,
  ctx: {
    parentSlotLabel: string;
    childListLabel: string;
    parentCount: number;
    childCountPerParent: number;
    anchorItemIndex?: number;
  }
): string {
  const { parentSlotLabel, childListLabel, parentCount, childCountPerParent, anchorItemIndex } = ctx;
  switch (scope) {
    case "parentOnly":
      return `将按「${parentSlotLabel}」生成 ${parentCount} 行；不循环「${childListLabel}」。`;
    case "parentAndChild":
      return `将按「${parentSlotLabel}」生成 ${parentCount} 行；每行内再按「${childListLabel}」生成最多 ${childCountPerParent} 项。`;
    case "childOnly": {
      const anchor =
        anchorItemIndex === undefined
          ? "首项"
          : anchorItemIndex === 0
            ? "第 1 项"
            : `第 ${anchorItemIndex + 1} 项`;
      return `不循环「${parentSlotLabel}」整行；只按「${childListLabel}」生成规格项（数据取自${anchor}父级项，约 ${childCountPerParent} 项）。`;
    }
    default:
      return "";
  }
}

export function buildRepeatBindPreviewCounts(
  payload: EmailPayload,
  slotId: string,
  itemPath: string | undefined,
  anchorItemIndex?: number
): { parentCount: number; childCountPerParent: number } {
  const parentCount = countPayloadListItems(payload, slotId);
  const childCountPerParent =
    itemPath?.trim()
      ? anchorItemIndex !== undefined
        ? countNestedListItems(payload, slotId, itemPath, anchorItemIndex)
        : countNestedListItemsFromFirstParent(payload, slotId, itemPath)
      : 0;
  return { parentCount, childCountPerParent };
}

/** 从模板 + 父级宿主读取已有的一层/二层 repeat，推导循环范围草稿 */
export function deriveUnifiedRepeatPlanFromTemplate(
  template: EmailTemplate,
  parentHostId: string,
  payloadSlotItemFields: BindingCollectionField[]
): Partial<UnifiedRepeatBindPlan> | null {
  const parentHost = template.blocks[parentHostId];
  const parentRepeat = parentHost?.repeat;
  const nestedFields = listNestedCollectionFields(payloadSlotItemFields);
  const defaultChildPath = nestedFields[0]?.path;

  const childRepeatEntry = (() => {
    if (!parentRepeat?.prototypeChildIds.length) return null;
    const hosts = listChildRepeatHostOptions(template, parentRepeat.prototypeChildIds);
    for (const host of hosts) {
      const block = template.blocks[host.hostId];
      const repeat = block?.repeat;
      if (repeat?.itemPath?.trim()) {
        return { hostId: host.hostId, repeat };
      }
    }
    return null;
  })();

  if (!parentRepeat && childRepeatEntry) {
    const { repeat, hostId } = childRepeatEntry;
    const nested = nestedFields.find((f) => f.path === repeat.itemPath) ?? nestedFields[0];
    return {
      scope: "childOnly",
      slotId: repeat.slotId,
      parentHostId,
      anchorItemIndex: repeat.anchorItemIndex ?? 0,
      childItemPath: repeat.itemPath,
      childHostId: hostId,
      childPrototypeChildIds: repeat.prototypeChildIds,
      childItemFields: repeat.itemFields,
      childLabel: repeat.label,
      childDescription: repeat.description,
      childMinItems: repeat.minItems,
      childMaxItems: repeat.maxItems,
    };
  }

  if (!parentRepeat) return { scope: "parentOnly", parentHostId };

  const plan: Partial<UnifiedRepeatBindPlan> = {
    scope: childRepeatEntry ? "parentAndChild" : "parentOnly",
    slotId: parentRepeat.slotId,
    parentHostId,
    parentPrototypeChildIds: parentRepeat.prototypeChildIds,
    parentItemFields: parentRepeat.itemFields,
    parentFieldMappings: parentRepeat.fieldMappings,
    parentLabel: parentRepeat.label,
    parentDescription: parentRepeat.description,
    parentMinItems: parentRepeat.minItems,
    parentMaxItems: parentRepeat.maxItems,
  };

  if (childRepeatEntry) {
    const { repeat, hostId } = childRepeatEntry;
    plan.childItemPath = repeat.itemPath ?? defaultChildPath;
    plan.childHostId = hostId;
    plan.childPrototypeChildIds = repeat.prototypeChildIds;
    plan.childItemFields = repeat.itemFields;
    plan.childFieldMappings = repeat.fieldMappings;
    plan.childLabel = repeat.label;
    plan.childDescription = repeat.description;
    plan.childMinItems = repeat.minItems;
    plan.childMaxItems = repeat.maxItems;
  }

  return plan;
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

/** 子级 repeat 行模板内「列表项下标」类 collection 绑定（如 slotPath `0.title`） */
function isChildRepeatListItemBinding(spec: BindingSpec, slotId: string): boolean {
  return (
    spec.mode === "variable" &&
    spec.allowExternal === true &&
    spec.valueType === "collection" &&
    spec.slotId === slotId &&
    collectionBindingUsesItemIndex(spec.slotPath)
  );
}

/** 父级行模板子树内带 itemPath 的嵌套 repeat 宿主 id */
function findNestedRepeatHostIds(template: EmailTemplate, rootIds: string[]): string[] {
  return collectSubtreeBlockIds(template, rootIds).filter(
    (blockId) => template.blocks[blockId]?.repeat?.itemPath?.trim()
  );
}

/**
 * 解除子级 repeat 后，清理其子树内残留的列表项 collection 绑定，避免文本字段仍声明 valueType=collection。
 */
function clearChildRepeatListItemBindingsInSubtree(
  template: EmailTemplate,
  childRepeatHostIds: string[],
  slotId: string
): EmailTemplate {
  if (childRepeatHostIds.length === 0) return template;
  const targetBlockIds = new Set<string>();
  for (const hostId of childRepeatHostIds) {
    for (const blockId of collectSubtreeBlockIds(template, [hostId])) {
      targetBlockIds.add(blockId);
    }
  }

  let next = template;
  for (const blockId of targetBlockIds) {
    const block = next.blocks[blockId];
    if (!block?.bindings) continue;
    const keptEntries = Object.entries(block.bindings).filter(
      ([, spec]) => !isChildRepeatListItemBinding(spec, slotId)
    );
    if (keptEntries.length === Object.keys(block.bindings).length) continue;
    const cleared = clone(next);
    const target = cleared.blocks[blockId]!;
    if (keptEntries.length === 0) {
      delete target.bindings;
    } else {
      target.bindings = Object.fromEntries(keptEntries);
    }
    next = cleared;
  }
  return next;
}

function buildParentRepeatPayload(plan: UnifiedRepeatBindPlan): Omit<
  RepeatRegionBinding,
  "mode" | "fallbackChildIds"
> {
  return {
    slotId: plan.slotId,
    prototypeChildIds: plan.parentPrototypeChildIds,
    itemFields: plan.parentItemFields,
    fieldMappings: plan.parentFieldMappings,
    minItems: plan.parentMinItems,
    maxItems: plan.parentMaxItems,
    label: plan.parentLabel,
    description: plan.parentDescription,
  };
}

function buildChildRepeatPayload(plan: UnifiedRepeatBindPlan): Omit<
  RepeatRegionBinding,
  "mode" | "fallbackChildIds"
> | null {
  if (!plan.childHostId || !plan.childPrototypeChildIds?.length || !plan.childItemPath?.trim()) {
    return null;
  }
  const nested = findCollectionFieldByPath(plan.parentItemFields, plan.childItemPath);
  return {
    slotId: plan.slotId,
    itemPath: plan.childItemPath,
    anchorItemIndex: plan.scope === "childOnly" ? (plan.anchorItemIndex ?? 0) : undefined,
    prototypeChildIds: plan.childPrototypeChildIds,
    itemFields: plan.childItemFields ?? (isCollectionField(nested) ? nested.itemFields : []),
    fieldMappings: plan.childFieldMappings,
    minItems: plan.childMinItems ?? (isCollectionField(nested) ? nested.minItems : undefined),
    maxItems: plan.childMaxItems ?? (isCollectionField(nested) ? nested.maxItems : undefined),
    label: plan.childLabel ?? (isCollectionField(nested) ? nested.label : undefined),
    description:
      plan.childDescription ??
      (isCollectionField(nested)
        ? `父级列表项内的「${nested.label ?? nested.key}」子列表`
        : undefined),
  };
}

/**
 * 一次性应用父级/子级列表重复（写入 template.blocks.*.repeat）。
 * 父级 itemFields 保留完整 schema（含子列表列）；父级 fieldMappings 仅映射标量列。
 */
export function applyUnifiedRepeatBinding(
  template: EmailTemplate,
  plan: UnifiedRepeatBindPlan,
  payload: EmailPayload | null = null
): EmailTemplate {
  const sourceTemplate = template;
  const normalized = normalizeTemplateBeforeUnifiedRepeatBinding(template, plan, sourceTemplate);
  template = normalized.template;
  plan = normalized.plan;

  const parentHost = template.blocks[plan.parentHostId];
  if (!parentHost || !isRepeatHostBlock(parentHost)) {
    throw new Error("父级列表重复只能绑定在布局容器、栅格或图片区块上。");
  }

  let next = template;
  const subtreeRoots = plan.parentPrototypeChildIds;

  if (plan.scope === "childOnly") {
    if (parentHost.repeat) {
      next = removeRepeatRegionBinding(next, plan.parentHostId, payload);
    }
    next = clearRepeatsInSubtree(next, subtreeRoots);
    const childPayload = buildChildRepeatPayload(plan);
    if (!childPayload || !plan.childHostId) {
      throw new Error("仅循环子级列表时需指定子级宿主与子列表路径。");
    }
    return applyRepeatRegionBinding(next, plan.childHostId, childPayload);
  }

  const parentScalars = parentScalarItemFields(plan.parentItemFields);
  const parentPlan: UnifiedRepeatBindPlan = {
    ...plan,
    parentItemFields: plan.parentItemFields,
    parentFieldMappings: plan.parentFieldMappings.filter((mapping) => {
      const field = findCollectionFieldByPath(parentScalars, mapping.sourcePath);
      return field && field.valueType !== "collection";
    }),
  };

  next = applyRepeatRegionBinding(next, plan.parentHostId, buildParentRepeatPayload(parentPlan));

  const nestedRepeatHostIds = findNestedRepeatHostIds(next, subtreeRoots);
  next = clearRepeatsInSubtree(next, subtreeRoots);
  if (plan.scope === "parentOnly") {
    next = clearChildRepeatListItemBindingsInSubtree(next, nestedRepeatHostIds, plan.slotId);
  }

  const parentBlock = next.blocks[plan.parentHostId];
  const clearedChildHostIds = new Set(
    collectSubtreeBlockIds(next, parentBlock?.repeat?.prototypeChildIds ?? subtreeRoots)
  );

  if (plan.scope === "parentAndChild") {
    const childPayload = buildChildRepeatPayload(plan);
    if (!childPayload || !plan.childHostId) {
      throw new Error("父级与子级都循环时需指定子级宿主、子列表路径与行模板。");
    }
    if (!clearedChildHostIds.has(plan.childHostId)) {
      throw new Error("子级循环容器必须在父级行模板子树内。");
    }
    next = applyRepeatRegionBinding(next, plan.childHostId, childPayload);
  }

  return next;
}

/**
 * 解除父级宿主绑定，并清除物化后整棵子树内的 repeat。
 * 父级物化后行模板原型 id 已从 blocks 移除，须在 host.children（物化根）上清理子级 repeat。
 */
export function removeUnifiedRepeatBinding(
  template: EmailTemplate,
  parentHostId: string,
  payload: EmailPayload | null
): EmailTemplate {
  let next = removeRepeatRegionBinding(template, parentHostId, payload);
  const materializedRoots = next.blocks[parentHostId]?.children ?? [];
  if (materializedRoots.length > 0) {
    next = clearRepeatsInSubtree(next, materializedRoots);
  }
  return next;
}

/** 从当前区块向上找「仅父级列表」repeat 宿主（无 itemPath） */
export function findOutermostParentListRepeatHost(
  template: EmailTemplate,
  blockId: string
): string | null {
  let current: string | null = blockId;
  let found: string | null = null;
  while (current) {
    const block = template.blocks[current];
    if (
      block?.repeat?.mode === "collection" &&
      isRepeatHostBlock(block) &&
      !block.repeat.itemPath?.trim()
    ) {
      found = current;
    }
    current = block.parentId ?? null;
  }
  return found;
}

/** 合一绑定弹窗的父级宿主：优先外层父级列表宿主，否则当前 layout/grid */
export function resolveUnifiedBindParentHostId(
  template: EmailTemplate,
  blockId: string,
  fallbackHostId: string
): string {
  return findOutermostParentListRepeatHost(template, blockId) ?? fallbackHostId;
}

/** 父级行模板子树内是否已有带 itemPath 的子级 repeat */
export function findChildRepeatInParentPrototype(
  template: EmailTemplate,
  parentPrototypeChildIds: string[]
): { hostId: string; repeat: RepeatRegionBinding } | null {
  const hosts = listChildRepeatHostOptions(template, parentPrototypeChildIds);
  for (const host of hosts) {
    const repeat = template.blocks[host.hostId]?.repeat;
    if (repeat?.itemPath?.trim()) return { hostId: host.hostId, repeat };
  }
  return null;
}

/**
 * 子级 repeat 行模板子树 blockId（父/子字段映射分区用）。
 * 优先用模板里已绑定的子级 repeat.prototypeChildIds；否则用向导里选中的子级行模板根。
 * 不用 childHostId：子级列表常写在父级行模板容器（如商品卡 layout）上，按 host 会误伤整卡。
 */
export function childRepeatMappingScopeBlockIds(
  template: EmailTemplate,
  parentPrototypeChildIds: string[],
  childPrototypeChildIds?: string[]
): Set<string> {
  const nested = findChildRepeatInParentPrototype(template, parentPrototypeChildIds);
  const roots =
    nested?.repeat?.prototypeChildIds?.length
      ? nested.repeat.prototypeChildIds
      : childPrototypeChildIds?.filter((id) => id.trim()) ?? [];
  if (roots.length === 0) return new Set();
  return new Set(collectSubtreeBlockIds(template, roots));
}

/** 过滤映射目标：排除子级行模板子树内的字段（父级映射区使用） */
export function filterParentRepeatMappingTargets<T extends { blockId: string }>(
  template: EmailTemplate,
  parentPrototypeChildIds: string[],
  childPrototypeChildIds: string[] | undefined,
  targets: T[]
): T[] {
  const exclude = childRepeatMappingScopeBlockIds(
    template,
    parentPrototypeChildIds,
    childPrototypeChildIds
  );
  if (exclude.size === 0) return targets;
  return targets.filter((target) => !exclude.has(target.blockId));
}

/** 过滤映射目标：仅保留子级行模板子树内的字段 */
export function filterChildRepeatMappingTargets<T extends { blockId: string }>(
  template: EmailTemplate,
  parentPrototypeChildIds: string[],
  childPrototypeChildIds: string[] | undefined,
  targets: T[]
): T[] {
  const include = childRepeatMappingScopeBlockIds(
    template,
    parentPrototypeChildIds,
    childPrototypeChildIds
  );
  if (include.size === 0) return [];
  return targets.filter((target) => include.has(target.blockId));
}
