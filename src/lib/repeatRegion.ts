import type {
  BindingCollectionField,
  BindingSpec,
  EmailBlock,
  EmailPayload,
  EmailTemplate,
  RepeatFieldMapping,
  RepeatRegionBinding,
} from "../types/email";
import type { RepeatRuntimeContext } from "../repeat-binding-contract";
import { collectionBindingUsesItemIndex } from "../payload-contract/repeat-list-item-binding";
import { applyCollectionItemVisibility } from "./collectionItemVisibility";
import { resolveRepeatExpansionMaxItems } from "./collectionFixedLength";
import { isRepeatHostBlock } from "./repeatHostBlock";
import {
  buildRepeatItemMaterializationSnapshots,
  type RepeatItemMaterializationSnapshot,
} from "../repeat-runtime/buildMaterializationSnapshots";
import { resolveRepeatItemsForExpansion } from "../repeat-runtime/repeatItemResolve";
import { finalizeMaterializedStaticBlock, snapshotBlockIdToPrototypeId } from "../repeat-runtime/repeatPrototypeSnapshot";
import { resolveRepeatContextForRef } from "../repeat-runtime/repeatVirtualResolver";
import { inferCollectionItemFieldsFromFirstRow } from "./collectionFieldMapping";
import type { RepeatUnbindMode } from "./repeatUnbindMode";

export type { RepeatRuntimeContext } from "../repeat-binding-contract";
export type { RepeatUnbindMode } from "./repeatUnbindMode";
export { repeatUnbindModeOptions } from "./repeatUnbindMode";

export { isRepeatHostBlock, isRepeatHostBlockType } from "./repeatHostBlock";
export type { RepeatHostBlock } from "./repeatHostBlock";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function collectionItems(
  payload: EmailPayload | null,
  repeat: RepeatRegionBinding
): Record<string, unknown>[] {
  if (repeat.itemPath?.trim()) return [];
  const raw = payload?.values?.[repeat.slotId];
  if (!Array.isArray(raw)) return [];
  const items = raw.filter((item): item is Record<string, unknown> => {
    return item !== null && typeof item === "object" && !Array.isArray(item);
  });
  const slotDef = payload?.slots?.[repeat.slotId];
  const filtered = applyCollectionItemVisibility(items, slotDef?.itemVisibility, slotDef);
  const maxItems = resolveRepeatExpansionMaxItems(repeat, payload);
  return maxItems !== undefined ? filtered.slice(0, maxItems) : filtered;
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

export function isRepeatListBindingChildBlock(template: EmailTemplate, blockId: string): boolean {
  const ctx = resolveRepeatContextForRef(template, { kind: "physical", blockId });
  if (ctx) return ctx.relation !== "host";

  let walkId: string | null = blockId;
  while (walkId !== null) {
    const currentWalkId: string = walkId;
    const block: EmailBlock | undefined = template.blocks[currentWalkId];
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
  return [...before, ...after];
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

/**
 * 物化后的静态行区块 id。
 * - 第 1 项（index 0）保留行模板原型 id。
 * - 第 2 项起为 `原型Id-2`、`原型Id-3`…
 */
export function materializedRepeatRowBlockId(prototypeBlockId: string, itemIndex: number): string {
  if (itemIndex <= 0) return prototypeBlockId;
  return `${prototypeBlockId}-${itemIndex + 1}`;
}

/**
 * 嵌套物化时按父级 SPU 行作用域生成唯一 id。
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

function resolvePermanentIdForMaterializedBlock(
  prototypeBlockId: string,
  itemIndex: number,
  topScopePermanentId: string,
  existingBlocks: EmailTemplate["blocks"],
  idsToRemove: Set<string>,
  permanentBlockIds: Set<string>
): string {
  const localId = materializedRepeatRowBlockId(prototypeBlockId, itemIndex);
  if (prototypeBlockId === topScopePermanentId && itemIndex === 0) return localId;
  const scoped = scopeMaterializedSubtreeBlockId(topScopePermanentId, localId);
  if (!existingBlocks[localId]) return localId;
  if (idsToRemove.has(localId) && !permanentBlockIds.has(localId)) return localId;
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

/** 区块是否为解除绑定物化出的静态行 */
export function isMaterializedRepeatRowBlockId(
  blockId: string,
  template: Pick<EmailTemplate, "blocks" | "blockMeta">
): boolean {
  const name = template.blockMeta?.[blockId]?.name ?? "";
  if (/（第\s*\d+\s*项）/.test(name)) return true;
  const match = blockId.match(/^(.+)-(\d+)$/);
  if (!match) return false;
  const prototypeId = match[1]!;
  const itemNum = Number(match[2]);
  if (!Number.isFinite(itemNum) || itemNum < 1) return false;
  if (itemNum >= 2) {
    return Boolean(template.blocks[prototypeId]) || Boolean(template.blockMeta?.[prototypeId]);
  }
  if (template.blocks[blockId]) return false;
  return Boolean(template.blockMeta?.[prototypeId]) && !template.blocks[prototypeId];
}

/** 解析物化行 id（`原型Id-项序号`，1-based） */
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

/** 将物化行/子树区块 id 归一为原型 id */
export function resolveMaterializedRowToPrototypeId(
  blockId: string,
  prototypeIdSet: Set<string>,
  template?: Pick<EmailTemplate, "blocks" | "blockMeta">
): string {
  const scoped = stripCellScopeFromMaterializedBlockId(blockId);
  const candidate = scoped ?? blockId;
  const parsed = parseMaterializedRepeatRowBlockId(candidate, prototypeIdSet, template);
  if (parsed) return parsed.prototypeId;
  const legacyFirstRow = candidate.match(/^(.+)-1$/);
  if (
    legacyFirstRow?.[1] &&
    prototypeIdSet.has(legacyFirstRow[1]) &&
    template?.blocks[legacyFirstRow[1]] &&
    !template.blocks[candidate]
  ) {
    return legacyFirstRow[1];
  }
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
 * 将物化 snapshot 写入模板为永久区块。
 */
function materializeRepeatSnapshotsToTemplate(
  next: EmailTemplate,
  hostBlockId: string,
  repeat: RepeatRegionBinding,
  snapshots: RepeatItemMaterializationSnapshot[],
  options?: { topParentId?: string; selfRepeat?: boolean }
): string[] {
  if (snapshots.length === 0) return [];

  const idsToRemove = new Set<string>();
  for (const rootId of [...repeat.prototypeChildIds, ...repeat.fallbackChildIds]) {
    for (const id of collectSubtreeBlockIds(next, rootId)) idsToRemove.add(id);
  }

  const permanentTopIds: string[] = [];
  const permanentBlockIds = new Set<string>();

  for (const snapshot of snapshots) {
    const topProtoId = snapshot.rootBlockIds[0];
    if (!topProtoId) continue;
    const topScopePermanentId = materializedRepeatRowBlockId(topProtoId, snapshot.itemIndex);

    const idMap = new Map<string, string>();
    for (const blockId of Object.keys(snapshot.blocks)) {
      const protoId = snapshotBlockIdToPrototypeId(blockId, topProtoId);
      idMap.set(
        blockId,
        resolvePermanentIdForMaterializedBlock(
          protoId,
          snapshot.itemIndex,
          topScopePermanentId,
          next.blocks,
          idsToRemove,
          permanentBlockIds
        )
      );
    }

    for (const [snapshotId, block] of Object.entries(snapshot.blocks)) {
      const permanentId = idMap.get(snapshotId)!;
      const permanentBlock = clone(block) as EmailBlock;
      permanentBlock.id = permanentId;
      const isTopRoot = snapshot.rootBlockIds.includes(snapshotId);
      permanentBlock.parentId = isTopRoot
        ? (options?.topParentId ?? hostBlockId)
        : (idMap.get(block.parentId ?? "") ?? block.parentId);
      permanentBlock.children = (permanentBlock.children ?? []).map(
        (childId) => idMap.get(childId) ?? childId
      );

      finalizeMaterializedStaticBlock(permanentBlock);
      next.blocks[permanentId] = permanentBlock;
      permanentBlockIds.add(permanentId);

      const meta = snapshot.blockMeta[snapshotId];
      if (meta) {
        next.blockMeta = next.blockMeta ?? {};
        const canonicalPermanentId = materializedRepeatRowBlockId(topProtoId, snapshot.itemIndex);
        const prototypeMetaName =
          next.blockMeta?.[topProtoId]?.name?.replace(/（第\s*\d+\s*项）/g, "").trim() ||
          meta.name?.replace(/（第\s*\d+\s*项）/g, "").trim();
        next.blockMeta[permanentId] = {
          ...meta,
          name:
            permanentId === canonicalPermanentId && prototypeMetaName
              ? prototypeMetaName
              : meta.name,
        };
      }
    }

    for (const rootId of snapshot.rootBlockIds) {
      const permanentRootId = idMap.get(rootId);
      if (permanentRootId) permanentTopIds.push(permanentRootId);
    }
  }

  reconcileBlockParentIdsFromChildren(next, permanentTopIds);

  for (const id of idsToRemove) {
    if (permanentBlockIds.has(id)) continue;
    delete next.blocks[id];
    if (next.blockMeta) delete next.blockMeta[id];
  }

  return permanentTopIds;
}

function collectSubtreeBlockIdsFromRoots(template: EmailTemplate, rootIds: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const rootId of rootIds) {
    for (const id of collectSubtreeBlockIds(template, rootId)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function clearRepeatsInSubtreeExceptRoots(template: EmailTemplate, rootIds: string[]): EmailTemplate {
  let next = template;
  const rootIdSet = new Set(rootIds);
  for (const blockId of collectSubtreeBlockIdsFromRoots(template, rootIds)) {
    if (rootIdSet.has(blockId)) continue;
    const block = next.blocks[blockId];
    if (!block?.repeat) continue;
    const cleared = clone(next);
    delete cleared.blocks[blockId]!.repeat;
    next = cleared;
  }
  return next;
}

function isRepeatListItemCollectionBinding(spec: BindingSpec, slotId: string): boolean {
  return (
    spec.mode === "variable" &&
    spec.allowExternal === true &&
    spec.valueType === "collection" &&
    spec.slotId === slotId &&
    collectionBindingUsesItemIndex(spec.slotPath)
  );
}

function clearRepeatListItemBindingsInSubtree(
  template: EmailTemplate,
  rootIds: string[],
  slotId: string
): EmailTemplate {
  if (rootIds.length === 0) return template;
  const targetBlockIds = collectSubtreeBlockIdsFromRoots(template, rootIds);
  let next = template;
  for (const blockId of targetBlockIds) {
    const block = next.blocks[blockId];
    if (!block?.bindings) continue;
    const keptEntries = Object.entries(block.bindings).filter(
      ([, spec]) => !isRepeatListItemCollectionBinding(spec, slotId)
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

function buildHostChildrenAfterPrototypeOnlyUnbind(
  originalChildren: string[],
  repeat: RepeatRegionBinding,
  blocks: EmailTemplate["blocks"]
): string[] {
  const { before, after } = splitRepeatHostStaticSiblingChildren(originalChildren, repeat);
  const prototypes = repeat.prototypeChildIds.filter((id) => Boolean(blocks[id]));
  if (prototypes.length > 0) {
    return [...before, ...prototypes, ...after];
  }
  const fallbackChildIds = repeat.fallbackChildIds.filter((childId) => Boolean(blocks[childId]));
  return [...before, ...fallbackChildIds, ...after];
}

function removeRepeatRegionBindingKeepPrototypeOnly(
  template: EmailTemplate,
  blockId: string
): EmailTemplate {
  const host = template.blocks[blockId];
  if (!host?.repeat) return template;

  const repeat = host.repeat;
  const selfRepeat =
    repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === blockId;

  let next = clone(template);

  if (selfRepeat && host.parentId) {
    const hostBlock = next.blocks[blockId];
    if (!hostBlock) return template;
    delete hostBlock.repeat;
    next = clearRepeatsInSubtreeExceptRoots(next, [blockId]);
    next = clearRepeatListItemBindingsInSubtree(next, [blockId], repeat.slotId);
    return next;
  }

  const hostBlock = next.blocks[blockId];
  if (!hostBlock) return template;
  hostBlock.children = buildHostChildrenAfterPrototypeOnlyUnbind(
    host.children ?? [],
    repeat,
    next.blocks
  );
  delete hostBlock.repeat;
  next = clearRepeatsInSubtreeExceptRoots(next, repeat.prototypeChildIds);
  next = clearRepeatListItemBindingsInSubtree(next, repeat.prototypeChildIds, repeat.slotId);
  return next;
}

function removeRepeatRegionBindingWhenCollectionEmpty(
  template: EmailTemplate,
  blockId: string,
  repeat: RepeatRegionBinding,
  selfRepeat: boolean
): EmailTemplate {
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

export type RepeatUnbindOptions = {
  mode?: RepeatUnbindMode;
};

/**
 * 解除列表重复绑定。
 */
export function removeRepeatRegionBinding(
  template: EmailTemplate,
  blockId: string,
  payload: EmailPayload | null = null,
  options?: RepeatUnbindOptions
): EmailTemplate {
  const host = template.blocks[blockId];
  if (!host?.repeat) return template;

  const repeat = host.repeat;
  const selfRepeat =
    repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === blockId;
  const itemCount = collectionItems(payload, repeat).length;
  const mode = options?.mode ?? "materializeRows";

  if (mode === "keepPrototypeOnly") {
    return removeRepeatRegionBindingKeepPrototypeOnly(template, blockId);
  }

  if (itemCount === 0) {
    return removeRepeatRegionBindingWhenCollectionEmpty(template, blockId, repeat, selfRepeat);
  }

  const snapshots = buildRepeatItemMaterializationSnapshots(template, payload, blockId);
  const next = clone(template);

  if (selfRepeat && host.parentId) {
    const permanentTopIds = materializeRepeatSnapshotsToTemplate(next, blockId, repeat, snapshots, {
      topParentId: host.parentId,
      selfRepeat: true,
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
    return next;
  }

  const permanentTopIds = materializeRepeatSnapshotsToTemplate(next, blockId, repeat, snapshots);
  const hostBlock = next.blocks[blockId];
  if (!hostBlock) return template;

  hostBlock.children = buildHostChildrenAfterUnbind(host.children ?? [], repeat, permanentTopIds);
  delete hostBlock.repeat;

  return next;
}

/** 解除列表绑定后应选中的区块 */
export function resolveRepeatUnbindSelectionBlockId(
  prevTemplate: EmailTemplate,
  nextTemplate: EmailTemplate,
  hostId: string
): string {
  const repeat = prevTemplate.blocks[hostId]?.repeat;
  const prototypeRootId = repeat?.prototypeChildIds[0] ?? hostId;
  if (nextTemplate.blocks[prototypeRootId]) {
    return prototypeRootId;
  }
  const legacyFirstRowId = `${prototypeRootId}-1`;
  if (nextTemplate.blocks[legacyFirstRowId]) {
    return legacyFirstRowId;
  }
  if (nextTemplate.blocks[hostId]) {
    return hostId;
  }
  return prototypeRootId;
}

export function inferCollectionFieldsFromItems(items: unknown[]): BindingCollectionField[] {
  const first = items.find((item) => item && typeof item === "object" && !Array.isArray(item));
  if (!first || typeof first !== "object" || Array.isArray(first)) return [];
  return inferCollectionItemFieldsFromFirstRow(first as Record<string, unknown>);
}
