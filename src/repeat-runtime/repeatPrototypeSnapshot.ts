import type { RepeatRuntimeContext } from "../repeat-binding-contract";
import type {
  BindingSpec,
  EmailBlock,
  EmailTemplate,
  RepeatFieldMapping,
  RepeatRegionBinding,
} from "../types/email";
import { collectionBindingUsesItemIndex } from "../payload-contract/repeat-list-item-binding";
import {
  buildRepeatFieldMappingCollectionSlotPath,
  resolveParentRowItemForNestedRepeat,
  resolveParentRowItemPathForNestedRepeat,
  resolveRepeatFieldMappingValue,
} from "../lib/repeatNestedFieldMapping";
import { getAtPath, setAtPath } from "../lib/paths";
import { formatRepeatItemDisplayName } from "../lib/repeatRegionTreeTags";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function stripCollectionIndex(slotPath: string): string {
  const parts = slotPath.split(".");
  if (/^\d+$/.test(parts[0] ?? "")) {
    return parts.slice(1).join(".");
  }
  return slotPath;
}

function rewriteRepeatBindingSpec(
  spec: BindingSpec,
  repeat: RepeatRegionBinding,
  itemPath: string
): BindingSpec {
  if (
    spec.mode !== "variable" ||
    spec.allowExternal !== true ||
    spec.valueType !== "collection" ||
    spec.slotId !== repeat.slotId ||
    typeof spec.slotPath !== "string" ||
    !spec.slotPath.trim()
  ) {
    return spec;
  }
  const fieldPath = stripCollectionIndex(spec.slotPath);
  return {
    ...spec,
    slotPath: fieldPath ? `${itemPath}.${fieldPath}` : itemPath,
    itemFields: spec.itemFields ?? repeat.itemFields,
    minItems: spec.minItems ?? repeat.minItems,
    maxItems: spec.maxItems ?? repeat.maxItems,
    label: spec.label ?? repeat.label,
    description: spec.description ?? repeat.description,
  };
}

function repeatFieldMappingSpec(
  repeat: RepeatRegionBinding,
  mapping: RepeatFieldMapping,
  nestedItemPath: string,
  parentItemPath: string | undefined
): BindingSpec {
  return {
    slotId: repeat.slotId,
    mode: "variable",
    allowExternal: true,
    valueType: "collection",
    slotPath: buildRepeatFieldMappingCollectionSlotPath(
      mapping,
      nestedItemPath,
      parentItemPath
    ),
    itemFields: repeat.itemFields,
    minItems: repeat.minItems,
    maxItems: repeat.maxItems,
    label: mapping.label ?? repeat.label,
    description: repeat.description,
  };
}

function materializeRepeatBindingValue(
  nextBlock: EmailBlock,
  bindPath: string,
  value: unknown
): void {
  const [root, ...rest] = bindPath.split(".");
  if (root !== "props" && root !== "wrapperStyle") return;
  const subPath = rest.join(".");
  const target =
    root === "props"
      ? (nextBlock.props ?? {})
      : (nextBlock.wrapperStyle ?? (nextBlock.wrapperStyle = {}));
  if (subPath) setAtPath(target as Record<string, unknown>, subPath, value);
  else (nextBlock as Record<string, unknown>)[root] = value;
}

function resolveRepeatItemBindingValue(
  spec: BindingSpec,
  repeat: RepeatRegionBinding,
  item: Record<string, unknown>
): unknown {
  if (
    spec.mode !== "variable" ||
    spec.allowExternal !== true ||
    spec.valueType !== "collection" ||
    spec.slotId !== repeat.slotId ||
    typeof spec.slotPath !== "string" ||
    !spec.slotPath.trim()
  ) {
    return undefined;
  }
  const fieldPath = stripCollectionIndex(spec.slotPath);
  if (!fieldPath) return item;
  return getAtPath(item, fieldPath);
}

function bindingValuePresentAtPath(block: EmailBlock, bindPath: string): boolean {
  const [root, ...rest] = bindPath.split(".");
  if (root !== "props" && root !== "wrapperStyle") return false;
  const target = root === "props" ? (block.props ?? {}) : (block.wrapperStyle ?? {});
  if (!rest.length) return false;
  const value = getAtPath(target as Record<string, unknown>, rest.join("."));
  return value !== undefined && value !== null && value !== "";
}

function collectSubtreeBlockIds(template: EmailTemplate, rootId: string): Set<string> {
  const ids = new Set<string>();
  const visit = (blockId: string) => {
    if (ids.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    ids.add(blockId);
    for (const childId of block.children ?? []) visit(childId);
  };
  visit(rootId);
  return ids;
}

function minMappedItemOffsetInSubtree(
  template: EmailTemplate,
  repeat: RepeatRegionBinding,
  rootId: string
): number | null {
  const subtreeIds = collectSubtreeBlockIds(template, rootId);
  let minOffset: number | null = null;
  for (const mapping of repeat.fieldMappings ?? []) {
    if (!subtreeIds.has(mapping.targetBlockId)) continue;
    const offset = Math.max(0, Math.floor(mapping.itemOffset ?? 0));
    minOffset = minOffset === null ? offset : Math.min(minOffset, offset);
  }
  return minOffset;
}

function shouldSkipMissingGroupItemSlot(
  opts: {
    sourceTemplate: EmailTemplate;
    repeat: RepeatRegionBinding;
    groupItems?: Record<string, unknown>[];
    repeatHostSourceId: string;
  },
  parentSourceId: string,
  childSourceId: string
): boolean {
  if (opts.repeat.itemMode !== "group") return false;
  if (parentSourceId !== opts.repeatHostSourceId) return false;
  const groupItemCount = opts.groupItems?.length ?? 1;
  const itemOffset = minMappedItemOffsetInSubtree(opts.sourceTemplate, opts.repeat, childSourceId);
  return itemOffset !== null && itemOffset >= groupItemCount;
}

/** 物化静态行：剥离已写入 props 的列表项 collection 绑定 */
export function finalizeMaterializedStaticBlock(block: EmailBlock): void {
  if (!block.bindings) return;
  for (const [bindPath, spec] of Object.entries(block.bindings)) {
    if (
      spec.mode !== "variable" ||
      spec.valueType !== "collection" ||
      !collectionBindingUsesItemIndex(spec.slotPath)
    ) {
      continue;
    }
    if (bindingValuePresentAtPath(block, bindPath)) {
      delete block.bindings[bindPath];
    }
  }
  if (block.bindings && Object.keys(block.bindings).length === 0) {
    delete block.bindings;
  }
}

export type PrototypeSubtreeSnapshot = {
  rootId: string;
  blocks: Record<string, EmailBlock>;
  blockMeta: NonNullable<EmailTemplate["blockMeta"]>;
};

/** 克隆 repeat 行模板子树为独立 snapshot（不写全局 template.blocks） */
export function clonePrototypeSubtreeSnapshot(opts: {
  sourceTemplate: EmailTemplate;
  sourceId: string;
  parentId: string | null;
  snapshotBlockId: string;
  repeatHostSourceId: string;
  repeat: RepeatRegionBinding;
  item: Record<string, unknown>;
  groupItems?: Record<string, unknown>[];
  itemPath: string;
  itemIndex: number;
  materializeRepeatItemBindings: boolean;
  contextStack?: RepeatRuntimeContext[];
}): PrototypeSubtreeSnapshot | null {
  const parentItem = opts.contextStack
    ? resolveParentRowItemForNestedRepeat(opts.repeat, opts.contextStack, opts.itemPath)
    : undefined;
  const parentItemPath = resolveParentRowItemPathForNestedRepeat(opts.repeat, opts.itemPath);
  const blocks: Record<string, EmailBlock> = {};
  const blockMeta: NonNullable<EmailTemplate["blockMeta"]> = {};

  const visit = (sourceId: string, parentId: string | null, snapshotId: string): string | null => {
    const source = opts.sourceTemplate.blocks[sourceId];
    if (!source) return null;

    const nextBlock = clone(source) as EmailBlock;
    nextBlock.id = snapshotId;
    nextBlock.parentId = parentId;
    if (sourceId === opts.repeatHostSourceId) {
      delete nextBlock.repeat;
    }
    if (nextBlock.bindings) {
      const nextBindings: NonNullable<EmailBlock["bindings"]> = {};
      for (const [bindPath, spec] of Object.entries(nextBlock.bindings)) {
        if (opts.materializeRepeatItemBindings) {
          const resolvedValue = resolveRepeatItemBindingValue(spec, opts.repeat, opts.item);
          if (resolvedValue !== undefined) {
            materializeRepeatBindingValue(nextBlock, bindPath, resolvedValue);
            continue;
          }
        }
        nextBindings[bindPath] = rewriteRepeatBindingSpec(spec, opts.repeat, opts.itemPath);
      }
      nextBlock.bindings = Object.keys(nextBindings).length > 0 ? nextBindings : undefined;
    }
    const fieldMappings = opts.repeat.fieldMappings?.filter(
      (mapping) => mapping.targetBlockId === sourceId
    );
    if (fieldMappings?.length) {
      for (const mapping of fieldMappings) {
        if (opts.materializeRepeatItemBindings) {
          const mappedValue = resolveRepeatFieldMappingValue(mapping, opts.item, parentItem, opts.groupItems);
          if (mappedValue !== undefined) {
            materializeRepeatBindingValue(nextBlock, mapping.targetBindPath, mappedValue);
            continue;
          }
        }
        nextBlock.bindings = { ...(nextBlock.bindings ?? {}) };
        nextBlock.bindings[mapping.targetBindPath] = repeatFieldMappingSpec(
          opts.repeat,
          mapping,
          opts.itemPath,
          parentItemPath
        );
      }
    }

    blocks[snapshotId] = nextBlock;
    const sourceMeta = opts.sourceTemplate.blockMeta?.[sourceId];
    if (sourceMeta) {
      blockMeta[snapshotId] = {
        ...sourceMeta,
        name: sourceMeta.name
          ? formatRepeatItemDisplayName(sourceMeta.name, opts.itemIndex)
          : undefined,
      };
    }

    const clonedChildren: string[] = [];
    for (const childId of source.children ?? []) {
      if (shouldSkipMissingGroupItemSlot(opts, sourceId, childId)) continue;
      const childSnapshotId = `${snapshotId}__${childId}`;
      const clonedChildId = visit(childId, snapshotId, childSnapshotId);
      if (clonedChildId) clonedChildren.push(clonedChildId);
    }
    nextBlock.children = clonedChildren;
    return snapshotId;
  };

  const rootId = visit(opts.sourceId, opts.parentId, opts.snapshotBlockId);
  if (!rootId) return null;
  return { rootId, blocks, blockMeta };
}

/** 将 snapshot 块 id 还原为 template 原型 id（取 __ 链末段） */
export function snapshotBlockIdToPrototypeId(snapshotBlockId: string, _prototypeRootId: string): string {
  if (!snapshotBlockId.includes("__")) return snapshotBlockId;
  const parts = snapshotBlockId.split("__");
  return parts[parts.length - 1]!;
}

/** 递归还原 snapshot 内全部 block id 为原型 id */
export function remapSnapshotBlocksToPrototypeIds(
  snapshot: PrototypeSubtreeSnapshot,
  prototypeRootId: string
): PrototypeSubtreeSnapshot {
  const idMap = new Map<string, string>();
  for (const id of Object.keys(snapshot.blocks)) {
    idMap.set(id, snapshotBlockIdToPrototypeId(id, prototypeRootId));
  }
  const blocks: Record<string, EmailBlock> = {};
  const blockMeta: NonNullable<EmailTemplate["blockMeta"]> = {};
  for (const [oldId, block] of Object.entries(snapshot.blocks)) {
    const newId = idMap.get(oldId)!;
    blocks[newId] = {
      ...clone(block),
      id: newId,
      parentId: block.parentId ? (idMap.get(block.parentId) ?? block.parentId) : block.parentId,
      children: (block.children ?? []).map((cid) => idMap.get(cid) ?? cid),
    };
    const meta = snapshot.blockMeta[oldId];
    if (meta) blockMeta[newId] = meta;
  }
  return {
    rootId: idMap.get(snapshot.rootId) ?? snapshot.rootId,
    blocks,
    blockMeta,
  };
}
