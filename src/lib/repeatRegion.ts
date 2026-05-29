import type {
  BindingCollectionField,
  BindingSpec,
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  RepeatRegionBinding,
} from "../types/email";
import { collectionBindingUsesItemIndex } from "../payload-contract/repeat-list-item-binding";
import { mergeTemplatePayload } from "./merge";
import { getAtPath, setAtPath } from "./paths";
import { isRepeatHostBlock, isRepeatHostBlockType } from "./repeatHostBlock";
import { applyCollectionDisplayRule } from "./collectionDisplayRule";

export { isRepeatHostBlock, isRepeatHostBlockType } from "./repeatHostBlock";
export type { RepeatHostBlock } from "./repeatHostBlock";

export const REPEAT_CLONE_ID_MARK = "__repeatClone__";

type RepeatRuntimeContext = {
  slotId: string;
  itemIndex: number;
  item: Record<string, unknown>;
  itemPath: string;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function sourceBlockIdFromRepeatClone(blockId: string): string {
  const index = blockId.indexOf(REPEAT_CLONE_ID_MARK);
  return index >= 0 ? blockId.slice(0, index) : blockId;
}

export function isRepeatCloneBlockId(blockId: string): boolean {
  return blockId.includes(REPEAT_CLONE_ID_MARK);
}

export function collectionItems(payload: EmailPayload | null, repeat: RepeatRegionBinding): Record<string, unknown>[] {
  if (repeat.itemPath?.trim()) return [];
  const raw = payload?.values?.[repeat.slotId];
  if (!Array.isArray(raw)) return [];
  const items = raw.filter((item): item is Record<string, unknown> => {
    return item !== null && typeof item === "object" && !Array.isArray(item);
  });
  const slotDef = payload?.slots?.[repeat.slotId];
  const slotRule = slotDef?.sceneCollectionPresetId ? slotDef.displayRule : undefined;
  const filtered = applyCollectionDisplayRule(items, slotRule);
  if (typeof repeat.maxItems === "number") return filtered.slice(0, repeat.maxItems);
  return filtered;
}

function stripCollectionIndex(slotPath: string): string {
  const parts = slotPath.split(".");
  if (/^\d+$/.test(parts[0] ?? "")) {
    return parts.slice(1).join(".");
  }
  return slotPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveAnchoredParentItem(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[]
): Record<string, unknown> | undefined {
  const anchorCtx = [...contexts].reverse().find((ctx) => ctx.slotId === repeat.slotId);
  if (anchorCtx?.item) return anchorCtx.item;
  if (!payload || repeat.anchorItemIndex === undefined) return undefined;
  const parentItems = collectionItems(payload, { ...repeat, itemPath: undefined });
  const index = repeat.anchorItemIndex;
  if (!Number.isInteger(index) || index < 0 || index >= parentItems.length) return undefined;
  return parentItems[index];
}

function resolveRepeatItemsForExpansion(
  repeat: RepeatRegionBinding,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[]
): Record<string, unknown>[] {
  if (!payload) return [];
  if (repeat.itemPath?.trim()) {
    const parentItem = resolveAnchoredParentItem(repeat, payload, contexts);
    const raw = parentItem ? getAtPath(parentItem, repeat.itemPath) : undefined;
    if (!Array.isArray(raw)) return [];
    const items = raw.filter(isRecord);
    return typeof repeat.maxItems === "number" ? items.slice(0, repeat.maxItems) : items;
  }
  return collectionItems(payload, repeat);
}

function rewriteRepeatBindingSpec(spec: BindingSpec, repeat: RepeatRegionBinding, itemPath: string): BindingSpec {
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

function buildCloneBlockId(sourceId: string, repeatBlockId: string, itemIndex: number): string {
  return `${sourceId}${REPEAT_CLONE_ID_MARK}${repeatBlockId}_${itemIndex}`;
}

export type RepeatContextRelation = "host" | "row-template" | "mapped-field";

/** 选中区块相对列表重复宿主的关系（含父级/祖先 repeat 继承） */
export type ResolvedRepeatContext = {
  hostId: string;
  repeat: RepeatRegionBinding;
  relation: RepeatContextRelation;
  /** 行模板根区块（prototypeChildIds 中命中祖先链的那一项） */
  prototypeRootId: string;
  /** 直接落在当前选中区块上的字段映射 */
  fieldMappingsOnBlock: RepeatFieldMapping[];
};

/** blockId 是否为 ancestorId 自身或其子孙 */
export function isDescendantOfBlock(
  template: EmailTemplate,
  blockId: string,
  ancestorId: string
): boolean {
  let currentId: string | null = blockId;
  while (currentId) {
    if (currentId === ancestorId) return true;
    currentId = template.blocks[currentId]?.parentId ?? null;
  }
  return false;
}

/**
 * 解析当前选中区块所处的列表重复上下文。
 * - 宿主 layout/grid/image 自身带 repeat → relation=host
 * - 子孙位于某宿主行模板子树内 → row-template 或 mapped-field
 * - 不在任何 repeat 行模板内 → null
 */
export function resolveRepeatContextForBlock(
  template: EmailTemplate,
  blockId: string
): ResolvedRepeatContext | null {
  const block = template.blocks[blockId];
  if (!block) return null;

  if (block.repeat?.mode === "collection" && isRepeatHostBlock(block)) {
    const prototypeRootId = block.repeat.prototypeChildIds[0];
    if (!prototypeRootId) return null;
    return {
      hostId: blockId,
      repeat: block.repeat,
      relation: "host",
      prototypeRootId,
      fieldMappingsOnBlock: [],
    };
  }

  let hostId: string | null = block.parentId;
  while (hostId) {
    const host = template.blocks[hostId];
    const repeat = host?.repeat;
    if (repeat?.mode === "collection" && isRepeatHostBlock(host)) {
      const prototypeRootId = repeat.prototypeChildIds.find((pid) =>
        isDescendantOfBlock(template, blockId, pid)
      );
      if (prototypeRootId) {
        const fieldMappingsOnBlock =
          repeat.fieldMappings?.filter((mapping) => mapping.targetBlockId === blockId) ?? [];
        return {
          hostId,
          repeat,
          relation: fieldMappingsOnBlock.length > 0 ? "mapped-field" : "row-template",
          prototypeRootId,
          fieldMappingsOnBlock,
        };
      }
    }
    hostId = host?.parentId ?? null;
  }

  return null;
}

/**
 * 是否为「列表重复」绑定层之下的子级区块（行模板 / fallback / 映射字段子树）。
 * 画布选中此类区块时不展示插入、移动、复制、删除等操作钮；repeat 宿主自身返回 false。
 */
export function isRepeatListBindingChildBlock(template: EmailTemplate, blockId: string): boolean {
  const ctx = resolveRepeatContextForBlock(template, blockId);
  if (ctx) return ctx.relation !== "host";

  let walkId: string | null = blockId;
  while (walkId) {
    const block = template.blocks[walkId];
    if (!block?.parentId) break;
    const parent = template.blocks[block.parentId];
    if (parent?.repeat?.mode === "collection" && isRepeatHostBlock(parent)) {
      const managed = [...parent.repeat.prototypeChildIds, ...parent.repeat.fallbackChildIds];
      return managed.some((rootId) => isDescendantOfBlock(template, blockId, rootId));
    }
    walkId = block.parentId;
  }
  return false;
}

export function collectionItemCount(
  payload: EmailPayload | null,
  repeat: RepeatRegionBinding,
  contexts: RepeatRuntimeContext[] = []
): number {
  return resolveRepeatItemsForExpansion(repeat, payload, contexts).length;
}

function repeatFieldMappingSpec(
  repeat: RepeatRegionBinding,
  mapping: RepeatFieldMapping,
  itemPath: string
): BindingSpec {
  return {
    slotId: repeat.slotId,
    mode: "variable",
    allowExternal: true,
    valueType: "collection",
    slotPath: `${itemPath}.${stripCollectionIndex(mapping.sourcePath)}`,
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

function clonePrototypeSubtree(opts: {
  out: EmailTemplate;
  sourceTemplate: EmailTemplate;
  sourceId: string;
  parentId: string;
  repeatHostSourceId: string;
  repeat: RepeatRegionBinding;
  itemIndex: number;
  item: Record<string, unknown>;
  itemPath: string;
  materializeRepeatItemBindings: boolean;
}): string | null {
  const source = opts.sourceTemplate.blocks[opts.sourceId];
  if (!source) return null;

  const nextId = buildCloneBlockId(source.id, opts.parentId, opts.itemIndex);
  const nextBlock = clone(source) as EmailBlock;
  nextBlock.id = nextId;
  nextBlock.parentId = opts.parentId;
  if (opts.sourceId === opts.repeatHostSourceId) {
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
    (mapping) => mapping.targetBlockId === source.id
  );
  if (fieldMappings?.length) {
    for (const mapping of fieldMappings) {
      if (opts.materializeRepeatItemBindings) {
        const mappedValue = getAtPath(opts.item, stripCollectionIndex(mapping.sourcePath));
        if (mappedValue !== undefined) {
          materializeRepeatBindingValue(nextBlock, mapping.targetBindPath, mappedValue);
          continue;
        }
      }
      nextBlock.bindings = { ...(nextBlock.bindings ?? {}) };
      nextBlock.bindings[mapping.targetBindPath] = repeatFieldMappingSpec(
        opts.repeat,
        mapping,
        opts.itemPath
      );
    }
  }

  opts.out.blocks[nextId] = nextBlock;
  if (opts.sourceTemplate.blockMeta?.[source.id]) {
    opts.out.blockMeta = opts.out.blockMeta ?? {};
    const sourceMeta = opts.sourceTemplate.blockMeta[source.id];
    opts.out.blockMeta[nextId] = {
      ...sourceMeta,
      name: sourceMeta.name ? `${sourceMeta.name}（第 ${opts.itemIndex + 1} 项）` : undefined,
    };
  }

  const clonedChildren: string[] = [];
  for (const childId of source.children ?? []) {
    const clonedChildId = clonePrototypeSubtree({
      ...opts,
      sourceId: childId,
      parentId: nextId,
    });
    if (clonedChildId) clonedChildren.push(clonedChildId);
  }
  nextBlock.children = clonedChildren;
  return nextId;
}

function isRepeatManagedChildId(childId: string, repeat: RepeatRegionBinding): boolean {
  return repeat.prototypeChildIds.includes(childId) || repeat.fallbackChildIds.includes(childId);
}

/** 将 repeat 宿主 children 拆成「原型前静态 / 原型后静态」（与解除绑定时物化顺序一致） */
export function splitRepeatHostStaticSiblingChildren(
  originalChildren: string[],
  repeat: RepeatRegionBinding
): { before: string[]; after: string[] } {
  const firstProtoIdx = originalChildren.findIndex((id) => repeat.prototypeChildIds.includes(id));
  if (firstProtoIdx < 0) {
    return {
      before: originalChildren.filter((id) => !isRepeatManagedChildId(id, repeat)),
      after: [],
    };
  }
  const before = originalChildren
    .slice(0, firstProtoIdx)
    .filter((id) => !repeat.prototypeChildIds.includes(id));
  const after = originalChildren
    .slice(firstProtoIdx + 1)
    .filter((id) => !repeat.prototypeChildIds.includes(id) && !repeat.fallbackChildIds.includes(id));
  return { before, after };
}

/** 展开或物化后 repeat 宿主的 children：保留静态兄弟，中间插入克隆行或 fallback */
export function buildRepeatHostExpandedChildren(
  originalChildren: string[],
  repeat: RepeatRegionBinding,
  expandedMiddleChildIds: string[]
): string[] {
  const { before, after } = splitRepeatHostStaticSiblingChildren(originalChildren, repeat);
  if (expandedMiddleChildIds.length > 0) {
    return [...before, ...expandedMiddleChildIds, ...after];
  }
  // 数组为空：不展开克隆行；仅保留静态兄弟（与「不占位高度」一致，fallback 由解绑恢复）
  return [...before, ...after];
}

/**
 * 将模板中的 collection repeat 区域展开成普通 block 树。
 *
 * 该函数只生成运行时视图，不改写磁盘上的 template：解绑时原始 children 仍然保留。
 */
export function expandRepeatRegions(template: EmailTemplate, payload: EmailPayload | null): EmailTemplate {
  const out = clone(template);

  const expandBlock = (blockId: string, contexts: RepeatRuntimeContext[]) => {
    const block = out.blocks[blockId];
    if (!block) return;
    const repeat = block.repeat;
    if (repeat?.mode === "collection") {
      const items = resolveRepeatItemsForExpansion(repeat, payload, contexts);
      const selfRepeat =
        repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === block.id;
      if (selfRepeat && block.parentId) {
        const parent = out.blocks[block.parentId];
        const sourceParent = template.blocks[block.parentId];
        if (!parent || !sourceParent) return;
        const sourceSiblings = sourceParent.children ?? [];
        const at = sourceSiblings.indexOf(block.id);
        if (at < 0) return;
        const before = sourceSiblings.slice(0, at);
        const after = sourceSiblings.slice(at + 1);
        const expandedSiblingIds: string[] = [];
        const expandedContexts = new Map<string, RepeatRuntimeContext[]>();
        items.forEach((item, itemIndex) => {
          const ctxItem = isRecord(item) ? item : {};
          const anchorCtx =
            repeat.itemPath?.trim()
              ? [...contexts].reverse().find((ctx) => ctx.slotId === repeat.slotId)
              : null;
          const itemPath =
            repeat.itemPath?.trim()
              ? anchorCtx
                ? `${anchorCtx.itemPath}.${repeat.itemPath}.${itemIndex}`
                : repeat.anchorItemIndex !== undefined
                  ? `${repeat.anchorItemIndex}.${repeat.itemPath}.${itemIndex}`
                  : `${repeat.itemPath}.${itemIndex}`
              : String(itemIndex);
          const nextContexts = [
            ...contexts,
            { slotId: repeat.slotId, itemIndex, item: ctxItem, itemPath },
          ];
          const clonedId = clonePrototypeSubtree({
            out,
            sourceTemplate: template,
            sourceId: block.id,
            parentId: block.parentId,
            repeatHostSourceId: block.id,
            repeat,
            itemIndex,
            item: ctxItem,
            itemPath,
            materializeRepeatItemBindings: false,
          });
          if (clonedId) {
            expandedSiblingIds.push(clonedId);
            expandedContexts.set(clonedId, nextContexts);
          }
        });
        parent.children = [...before, ...expandedSiblingIds, ...after];
        const expandedSet = new Set(expandedSiblingIds);
        for (const siblingId of parent.children) {
          if (expandedSet.has(siblingId)) {
            expandBlock(siblingId, expandedContexts.get(siblingId) ?? contexts);
          } else if (siblingId !== block.id) {
            expandBlock(siblingId, contexts);
          }
        }
        return;
      }
      // 嵌套 repeat 时 out 上可能已有外层克隆的行模板子节点；拆静态兄弟须以磁盘 template 的 children 为准
      const sourceHostId = isRepeatCloneBlockId(blockId)
        ? sourceBlockIdFromRepeatClone(blockId)
        : blockId;
      const originalChildren =
        template.blocks[sourceHostId]?.children ?? block.children ?? [];
      const expandedMiddleChildIds: string[] = [];
      const expandedMiddleContexts = new Map<string, RepeatRuntimeContext[]>();
      items.forEach((item, itemIndex) => {
        const ctxItem = isRecord(item) ? item : {};
        const anchorCtx =
          repeat.itemPath?.trim()
            ? [...contexts].reverse().find((ctx) => ctx.slotId === repeat.slotId)
            : null;
        const itemPath =
          repeat.itemPath?.trim()
            ? anchorCtx
              ? `${anchorCtx.itemPath}.${repeat.itemPath}.${itemIndex}`
              : repeat.anchorItemIndex !== undefined
                ? `${repeat.anchorItemIndex}.${repeat.itemPath}.${itemIndex}`
                : `${repeat.itemPath}.${itemIndex}`
            : String(itemIndex);
        const nextContexts = [
          ...contexts,
          { slotId: repeat.slotId, itemIndex, item: ctxItem, itemPath },
        ];
        for (const prototypeChildId of repeat.prototypeChildIds) {
          const clonedId = clonePrototypeSubtree({
            out,
            sourceTemplate: template,
            sourceId: prototypeChildId,
            parentId: block.id,
            repeatHostSourceId: block.id,
            repeat,
            itemIndex,
            item: ctxItem,
            itemPath,
            materializeRepeatItemBindings: false,
          });
          if (clonedId) {
            expandedMiddleChildIds.push(clonedId);
            expandedMiddleContexts.set(clonedId, nextContexts);
          }
        }
      });
      block.children = buildRepeatHostExpandedChildren(
        originalChildren,
        repeat,
        expandedMiddleChildIds
      );
      const expandedMiddleSet = new Set(expandedMiddleChildIds);
      for (const childId of block.children ?? []) {
        if (expandedMiddleSet.has(childId)) {
          expandBlock(childId, expandedMiddleContexts.get(childId) ?? contexts);
        } else {
          expandBlock(childId, contexts);
        }
      }
      return;
    }

    for (const childId of block.children ?? []) {
      expandBlock(childId, contexts);
    }
  };

  expandBlock(out.rootBlockId, []);
  return out;
}

export function applyRepeatRegionBinding(
  template: EmailTemplate,
  blockId: string,
  repeat: Omit<RepeatRegionBinding, "mode" | "fallbackChildIds"> & { fallbackChildIds?: string[] }
): EmailTemplate {
  const next = clone(template);
  const block = next.blocks[blockId];
  if (!block) return template;
  if (!isRepeatHostBlock(block)) {
    throw new Error("列表重复只能绑定在布局容器、栅格或图片区块上，不能绑定在邮件根节点。");
  }
  block.repeat = {
    mode: "collection",
    ...repeat,
    fallbackChildIds:
      repeat.fallbackChildIds ??
      block.repeat?.fallbackChildIds ??
      [...repeat.prototypeChildIds],
  };
  return next;
}

function collectSubtreeBlockIds(template: EmailTemplate, rootId: string): string[] {
  const ids: string[] = [];
  const visit = (id: string) => {
    if (!template.blocks[id]) return;
    ids.push(id);
    for (const childId of template.blocks[id]!.children ?? []) visit(childId);
  };
  visit(rootId);
  return ids;
}

/** 从 repeat 克隆 id 解析项下标（取末尾 _N） */
export function repeatCloneItemIndex(cloneBlockId: string): number | null {
  if (!isRepeatCloneBlockId(cloneBlockId)) return null;
  const match = cloneBlockId.match(/_(\d+)$/);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
}

/** 物化后的静态行区块 id：原型 id + 1-based 项序号 */
export function materializedRepeatRowBlockId(prototypeBlockId: string, itemIndex: number): string {
  return `${prototypeBlockId}-${itemIndex + 1}`;
}

/**
 * 嵌套物化时按父级 SPU 行作用域生成唯一 id，避免多组 SPU 共用 `sku-1-1` 等同名块。
 * 例：`cell-1` + `sku-1-3` → `rfj-picked-spotlight-cell-1-sku-1-3`
 */
export function scopeMaterializedSubtreeBlockId(
  topScopePermanentId: string,
  localMaterializedId: string
): string {
  if (localMaterializedId === topScopePermanentId) return localMaterializedId;
  const hostPrefix = topScopePermanentId.replace(/-cell-\d+$/, "");
  if (localMaterializedId.startsWith(`${hostPrefix}-`)) {
    const rel = localMaterializedId.slice(hostPrefix.length + 1);
    return `${topScopePermanentId}-${rel}`;
  }
  return `${topScopePermanentId}-${localMaterializedId}`;
}

/** 去掉 `cell-N-` 作用域前缀，供物化行 id 归一为原型 id */
export function stripCellScopeFromMaterializedBlockId(blockId: string): string | null {
  const match = blockId.match(/^(.+-cell-\d+)-(.+)$/);
  if (!match) return null;
  const [, scope, tail] = match;
  const hostPrefix = scope.replace(/-cell-\d+$/, "");
  return `${hostPrefix}-${tail}`;
}

function resolvePermanentIdForMaterializedClone(
  cloneId: string,
  topCloneId: string,
  topScopePermanentId: string,
  existingBlocks: EmailTemplate["blocks"]
): string {
  const protoId = sourceBlockIdFromRepeatClone(cloneId);
  const itemIndex = repeatCloneItemIndex(cloneId) ?? 0;
  const localId = materializedRepeatRowBlockId(protoId, itemIndex);
  if (cloneId === topCloneId) return localId;
  const scoped = scopeMaterializedSubtreeBlockId(topScopePermanentId, localId);
  if (!existingBlocks[localId]) return localId;
  return scoped;
}

/** 按 children 树结构回写 parentId，修正物化时 id 映射遗漏 */
export function reconcileBlockParentIdsFromChildren(
  template: EmailTemplate,
  rootBlockIds: string[]
): void {
  const visit = (parentId: string, childIds: string[]) => {
    for (const childId of childIds) {
      const child = template.blocks[childId];
      if (!child) continue;
      child.parentId = parentId;
      visit(childId, child.children ?? []);
    }
  };
  for (const rootId of rootBlockIds) {
    const root = template.blocks[rootId];
    if (!root) continue;
    visit(rootId, root.children ?? []);
  }
}

function bindingValuePresentAtPath(block: EmailBlock, bindPath: string): boolean {
  const [root, ...rest] = bindPath.split(".");
  if (root !== "props" && root !== "wrapperStyle") return false;
  const target =
    root === "props" ? (block.props ?? {}) : (block.wrapperStyle ?? {});
  if (!rest.length) return false;
  const value = getAtPath(target as Record<string, unknown>, rest.join("."));
  return value !== undefined && value !== null && value !== "";
}

/** 嵌套 SKU 列表项字段绑定写在物化静态行上会导致 collection 与字段类型硬错误 */
function isNestedSkuCollectionItemBinding(slotPath: string | undefined): boolean {
  if (!slotPath?.trim()) return false;
  return /\.\d+\.skus\.\d+/.test(slotPath) || /^\d+\.skus\.\d+/.test(slotPath);
}

/** 物化静态行：剥离嵌套 skus 下标绑定（预览值已写入 props/wrapperStyle），SPU 级 0.xxx 保留 */
function finalizeMaterializedStaticBlock(block: EmailBlock): void {
  if (!block.bindings) return;
  for (const [bindPath, spec] of Object.entries(block.bindings)) {
    if (
      spec.mode !== "variable" ||
      spec.valueType !== "collection" ||
      !isNestedSkuCollectionItemBinding(spec.slotPath)
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

/** 区块是否为解除绑定物化出的静态行（名称含「第 N 项」或原型块已从 blocks 移除） */
export function isMaterializedRepeatRowBlockId(
  blockId: string,
  template: Pick<EmailTemplate, "blocks" | "blockMeta">
): boolean {
  const name = template.blockMeta?.[blockId]?.name ?? "";
  if (/（第\s*\d+\s*项）/.test(name)) return true;
  const match = blockId.match(/^(.+)-(\d+)$/);
  if (!match) return false;
  const prototypeId = match[1]!;
  return Boolean(template.blockMeta?.[prototypeId]) && !template.blocks[prototypeId];
}

/** 解析物化行 id（`原型Id-项序号`，1-based）；`rfj-picked-spotlight-sku-1` 等合法原型 id 不解析 */
export function parseMaterializedRepeatRowBlockId(
  blockId: string,
  prototypeIdSet: Set<string>,
  template?: Pick<EmailTemplate, "blocks" | "blockMeta">
): { prototypeId: string; itemIndex: number } | null {
  if (template && !isMaterializedRepeatRowBlockId(blockId, template)) return null;
  const match = blockId.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  const prototypeId = match[1]!;
  if (!prototypeIdSet.has(prototypeId)) return null;
  const itemIndex = Number(match[2]) - 1;
  if (!Number.isFinite(itemIndex) || itemIndex < 0) return null;
  return { prototypeId, itemIndex };
}

/**
 * 构建模板中可作为「行模板原型」的 id 集合（blockMeta + 由物化 id 反推的原型）。
 * 解除绑定物化后原型块可能已从 blocks/blockMeta 移除，仍须从 `*-1` 等形式反推原型 id。
 */
export function buildRepeatPrototypeIdSet(template: EmailTemplate): Set<string> {
  const set = new Set<string>();
  for (const id of Object.keys(template.blockMeta ?? {})) {
    set.add(id);
  }
  for (const id of Object.keys(template.blocks)) {
    set.add(id);
    const parsed = id.match(/^(.+)-(\d+)$/);
    if (parsed?.[1]) {
      set.add(parsed[1]);
    }
  }
  return set;
}

/** 将物化行/子树区块 id 归一为原型 id（无法识别时原样返回） */
export function resolveMaterializedRowToPrototypeId(
  blockId: string,
  prototypeIdSet: Set<string>,
  template?: Pick<EmailTemplate, "blocks" | "blockMeta">
): string {
  const scoped = stripCellScopeFromMaterializedBlockId(blockId);
  const candidate = scoped ?? blockId;
  const parsed = parseMaterializedRepeatRowBlockId(candidate, prototypeIdSet, template);
  if (parsed) return parsed.prototypeId;
  return blockId;
}

function buildHostChildrenAfterUnbind(
  originalChildren: string[],
  repeat: RepeatRegionBinding,
  permanentTopIds: string[]
): string[] {
  const firstProtoIdx = originalChildren.findIndex((id) => repeat.prototypeChildIds.includes(id));
  if (firstProtoIdx < 0) {
    return [
      ...originalChildren.filter((id) => !isRepeatManagedChildId(id, repeat)),
      ...permanentTopIds,
    ];
  }
  return buildRepeatHostExpandedChildren(originalChildren, repeat, permanentTopIds);
}

/**
 * 将展开后的 repeat 克隆子树写入模板为永久区块（保留当前 payload 项数与合并预览内容）。
 */
function materializeRepeatExpandedSubtree(
  next: EmailTemplate,
  merged: EmailTemplate,
  hostBlockId: string,
  repeat: RepeatRegionBinding,
  options?: {
    topCloneIds?: string[];
    topParentId?: string;
  }
): string[] {
  const expandedHost = merged.blocks[hostBlockId];
  const topCloneIds = options?.topCloneIds ?? expandedHost?.children ?? [];
  if (topCloneIds.length === 0) return [];

  const idsToRemove = new Set<string>();
  for (const rootId of [...repeat.prototypeChildIds, ...repeat.fallbackChildIds]) {
    for (const id of collectSubtreeBlockIds(next, rootId)) idsToRemove.add(id);
  }

  const permanentTopIds: string[] = [];

  for (const topCloneId of topCloneIds) {
    if (!isRepeatCloneBlockId(topCloneId)) continue;
    const subtreeCloneIds = collectSubtreeBlockIds(merged, topCloneId);
    const idMap = new Map<string, string>();
    const topProtoId = sourceBlockIdFromRepeatClone(topCloneId);
    const topItemIndex = repeatCloneItemIndex(topCloneId) ?? 0;
    const topScopePermanentId = materializedRepeatRowBlockId(topProtoId, topItemIndex);

    for (const cloneId of subtreeCloneIds) {
      idMap.set(
        cloneId,
        resolvePermanentIdForMaterializedClone(
          cloneId,
          topCloneId,
          topScopePermanentId,
          next.blocks
        )
      );
      idsToRemove.add(sourceBlockIdFromRepeatClone(cloneId));
    }

    for (const cloneId of subtreeCloneIds) {
      const permanentId = idMap.get(cloneId)!;
      const mergedBlock = merged.blocks[cloneId];
      if (!mergedBlock) continue;

      const permanentBlock = clone(mergedBlock) as EmailBlock;
      permanentBlock.id = permanentId;
      permanentBlock.parentId =
        cloneId === topCloneId
          ? (options?.topParentId ?? hostBlockId)
          : (idMap.get(mergedBlock.parentId ?? "") ?? mergedBlock.parentId);
      permanentBlock.children = (permanentBlock.children ?? []).map(
        (childId) => idMap.get(childId) ?? childId
      );

      finalizeMaterializedStaticBlock(permanentBlock);
      next.blocks[permanentId] = permanentBlock;

      const metaFromClone = merged.blockMeta?.[cloneId] ?? next.blockMeta?.[sourceBlockIdFromRepeatClone(cloneId)];
      if (metaFromClone) {
        next.blockMeta = next.blockMeta ?? {};
        next.blockMeta[permanentId] = { ...metaFromClone };
      }
    }

    permanentTopIds.push(idMap.get(topCloneId)!);
  }

  reconcileBlockParentIdsFromChildren(next, permanentTopIds);

  for (const id of idsToRemove) {
    delete next.blocks[id];
    if (next.blockMeta) delete next.blockMeta[id];
  }

  return permanentTopIds;
}

/**
 * 解除列表重复绑定。
 * - 若 payload 中当前数组有 N 项：按合并预览物化为 N 组静态子树（保留画布内容与 collection 下标绑定）。
 * - 若数组为空：恢复 fallbackChildIds（与历史行为一致）。
 */
export function removeRepeatRegionBinding(
  template: EmailTemplate,
  blockId: string,
  payload: EmailPayload | null = null
): EmailTemplate {
  const host = template.blocks[blockId];
  if (!host?.repeat) return template;

  const repeat = host.repeat;
  const selfRepeat =
    repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === blockId;
  const itemCount = collectionItems(payload, repeat).length;

  if (itemCount === 0) {
    const next = clone(template);
    const block = next.blocks[blockId];
    if (!block) return template;
    if (!selfRepeat) {
      const fallbackChildIds = repeat.fallbackChildIds.filter((childId) => Boolean(next.blocks[childId]));
      block.children = fallbackChildIds.length > 0 ? fallbackChildIds : block.children;
    }
    delete block.repeat;
    return next;
  }

  const expanded = expandRepeatRegions(template, payload);
  const merged = mergeTemplatePayload(
    expanded,
    payload ?? { schemaVersion: "1.0.0", slots: {}, values: {} }
  );

  const next = clone(template);
  if (selfRepeat && host.parentId) {
    const topCloneIds = (merged.blocks[host.parentId]?.children ?? []).filter(
      (id) => isRepeatCloneBlockId(id) && sourceBlockIdFromRepeatClone(id) === blockId
    );
    const permanentTopIds = materializeRepeatExpandedSubtree(next, merged, blockId, repeat, {
      topCloneIds,
      topParentId: host.parentId,
    });
    const parent = next.blocks[host.parentId];
    if (!parent) return template;
    const currentChildren = parent.children ?? [];
    const at = currentChildren.indexOf(blockId);
    if (at < 0) return template;
    parent.children = [
      ...currentChildren.slice(0, at),
      ...permanentTopIds,
      ...currentChildren.slice(at + 1),
    ];
    for (const id of collectSubtreeBlockIds(next, blockId)) {
      delete next.blocks[id];
      if (next.blockMeta) delete next.blockMeta[id];
    }
    return next;
  }

  const permanentTopIds = materializeRepeatExpandedSubtree(next, merged, blockId, repeat);
  const hostBlock = next.blocks[blockId];
  if (!hostBlock) return template;

  hostBlock.children = buildHostChildrenAfterUnbind(host.children ?? [], repeat, permanentTopIds);
  delete hostBlock.repeat;

  return next;
}

export function inferCollectionFieldsFromItems(items: unknown[]): BindingCollectionField[] {
  const first = items.find((item) => item && typeof item === "object" && !Array.isArray(item));
  if (!first || typeof first !== "object" || Array.isArray(first)) return [];
  const out: BindingCollectionField[] = [];
  for (const [key, value] of Object.entries(first as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out.push({
        key,
        label: key,
        valueType: "collection",
        itemFields: inferCollectionFieldsFromItems(value),
        minItems: value.length,
        maxItems: value.length,
      });
      continue;
    }
    if (typeof value !== "string") continue;
    const lowerKey = key.toLowerCase();
    const stringValue = String(value);
    const valueType: BindingCollectionField["valueType"] =
      lowerKey.includes("image") ||
      lowerKey.includes("icon") ||
      lowerKey.endsWith("src") ||
      /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(stringValue)
        ? "image"
        : lowerKey.includes("url") || lowerKey.includes("link") || lowerKey.includes("href")
          ? "url"
          : "string";
    out.push({
      key,
      label: key,
      valueType,
    });
  }
  return out;
}
