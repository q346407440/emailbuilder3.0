import type { PreviewBlockNode, RepeatPreviewModel, VirtualBlockRef } from "../repeat-binding-contract";
import type { EmailBlock, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import type { BlockMaster } from "../types/master";
import type { BlockCatalogEntry } from "./blockDefaults";
import type { SectionMaster } from "../types/master";
import { isRepeatHostBlock } from "./repeatHostBlock";
import { splitRepeatHostStaticSiblingChildren } from "./repeatRegion";
import { insertCatalogBlockAtParentIndex } from "./templateBlockInsert";
import { insertSectionAtParentIndex } from "./sectionMasterOps";
import { finalizeRepeatHostChildInsert } from "./templateBlockSiblingOps";
import { moveBlockToParentIndex } from "./templateBlockSiblingOps";

export type CanvasDragInsertPayload =
  | { kind: "block"; masterId: string; label: string }
  | { kind: "section"; masterId: string; label: string }
  | { kind: "move"; blockId: string; label: string };

export const CANVAS_DRAG_INSERT_DATA_TYPE = "canvas-drag-insert";

export type PhysicalInsertTarget = {
  parentId: string;
  insertIndex: number;
};

const INSERT_PARENT_TYPES = new Set<EmailBlock["type"]>([
  "emailRoot",
  "layout",
  "grid",
  "image",
]);

export function encodeCanvasDropSlotId(parentPreviewBlockId: string, insertIndex: number): string {
  return `canvas-drop:${parentPreviewBlockId}:${insertIndex}`;
}

export function decodeCanvasDropSlotId(
  id: string
): { parentPreviewBlockId: string; insertIndex: number } | null {
  const match = /^canvas-drop:(.+):(\d+)$/.exec(id);
  if (!match) return null;
  return {
    parentPreviewBlockId: match[1]!,
    insertIndex: Number(match[2]),
  };
}

export function encodeCanvasDragId(payload: CanvasDragInsertPayload): string {
  if (payload.kind === "move") return `canvas-drag:move:${payload.blockId}`;
  return `canvas-drag:${payload.kind}:${payload.masterId}`;
}

export function isCanvasInsertParentBlock(block: EmailBlock | undefined): boolean {
  if (!block) return false;
  return INSERT_PARENT_TYPES.has(block.type);
}

export function findRefByPreviewBlockId(
  model: RepeatPreviewModel,
  blockId: string
): VirtualBlockRef | null {
  const visit = (node: PreviewBlockNode): VirtualBlockRef | null => {
    if (node.block.id === blockId) return node.ref;
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(model.root);
}

export function findPreviewNodeByBlockId(
  model: RepeatPreviewModel,
  blockId: string
): PreviewBlockNode | null {
  const visit = (node: PreviewBlockNode): PreviewBlockNode | null => {
    if (node.block.id === blockId) return node;
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(model.root);
}

function sameRepeatExpansionRun(a: VirtualBlockRef, b: VirtualBlockRef): boolean {
  if (a.kind !== "repeat-item" || b.kind !== "repeat-item") return false;
  return a.hostId === b.hostId && a.prototypeRootId === b.prototypeRootId;
}

/** 预览槽位紧跟 child[i] 之后时，若与 child[i+1] 同属一条 repeat 展开，则无效。 */
function shouldHideInsertSlotAfterChild(
  child: PreviewBlockNode,
  childIndex: number,
  siblings: PreviewBlockNode[]
): boolean {
  const next = siblings[childIndex + 1];
  if (!next) return false;
  return sameRepeatExpansionRun(child.ref, next.ref);
}

function prototypeManagedRegionEnd(
  originalChildren: string[],
  repeat: NonNullable<EmailBlock["repeat"]>
): number {
  const first = originalChildren.findIndex(
    (id) => repeat.prototypeChildIds.includes(id) || repeat.fallbackChildIds.includes(id)
  );
  if (first < 0) return originalChildren.length;
  let end = first;
  while (end < originalChildren.length) {
    const id = originalChildren[end]!;
    if (!repeat.prototypeChildIds.includes(id) && !repeat.fallbackChildIds.includes(id)) break;
    end++;
  }
  return end;
}

function listRepeatHostPreviewInsertSlotTargets(
  host: EmailBlock,
  previewChildren: PreviewBlockNode[]
): (PhysicalInsertTarget | null)[] {
  const repeat = host.repeat!;
  const originalChildren = host.children ?? [];
  const { before } = splitRepeatHostStaticSiblingChildren(originalChildren, repeat);
  const firstProtoIdx = originalChildren.findIndex((id) => repeat.prototypeChildIds.includes(id));
  const protoRegionEnd = prototypeManagedRegionEnd(originalChildren, repeat);
  const hostId = host.id;
  const slots: (PhysicalInsertTarget | null)[] = [];

  const slotBeforeChild = (child: PreviewBlockNode): PhysicalInsertTarget => {
    if (child.ref.kind === "physical" && before.includes(child.ref.blockId)) {
      const idx = originalChildren.indexOf(child.ref.blockId);
      return { parentId: hostId, insertIndex: idx >= 0 ? idx : 0 };
    }
    if (child.ref.kind === "repeat-item") {
      return {
        parentId: hostId,
        insertIndex: firstProtoIdx >= 0 ? firstProtoIdx : originalChildren.length,
      };
    }
    const idx = originalChildren.indexOf(child.ref.blockId);
    return { parentId: hostId, insertIndex: idx >= 0 ? idx : originalChildren.length };
  };

  const slotAfterChild = (child: PreviewBlockNode): PhysicalInsertTarget => {
    if (child.ref.kind === "physical" && before.includes(child.ref.blockId)) {
      const idx = originalChildren.indexOf(child.ref.blockId);
      return { parentId: hostId, insertIndex: idx >= 0 ? idx + 1 : 0 };
    }
    if (child.ref.kind === "repeat-item") {
      return { parentId: hostId, insertIndex: protoRegionEnd };
    }
    const idx = originalChildren.indexOf(child.ref.blockId);
    return { parentId: hostId, insertIndex: idx >= 0 ? idx + 1 : originalChildren.length };
  };

  if (previewChildren.length === 0) {
    return [{ parentId: hostId, insertIndex: originalChildren.length }];
  }

  slots.push(slotBeforeChild(previewChildren[0]!));

  for (let i = 0; i < previewChildren.length; i++) {
    const child = previewChildren[i]!;
    if (shouldHideInsertSlotAfterChild(child, i, previewChildren)) {
      slots.push(null);
      continue;
    }
    slots.push(slotAfterChild(child));
  }

  return slots;
}

function listStandardPreviewInsertSlotTargets(
  sourceTemplate: EmailTemplate,
  parentNode: PreviewBlockNode
): (PhysicalInsertTarget | null)[] {
  const parentRef = parentNode.ref;
  const previewChildren = parentNode.children;
  const physicalParentId =
    parentRef.kind === "repeat-item" ? parentRef.prototypeRootId : parentRef.blockId;
  const physicalParent = sourceTemplate.blocks[physicalParentId];
  if (!physicalParent || !isCanvasInsertParentBlock(physicalParent)) {
    return Array.from({ length: previewChildren.length + 1 }, () => null);
  }

  const physicalChildren = physicalParent.children ?? [];
  const slots: (PhysicalInsertTarget | null)[] = [];

  slots.push({ parentId: physicalParentId, insertIndex: 0 });

  for (let i = 0; i < previewChildren.length; i++) {
    const child = previewChildren[i]!;
    if (shouldHideInsertSlotAfterChild(child, i, previewChildren)) {
      slots.push(null);
      continue;
    }

    if (child.ref.kind === "repeat-item") {
      const protoId = child.ref.prototypeRootId;
      const at = physicalChildren.indexOf(protoId);
      slots.push({
        parentId: physicalParentId,
        insertIndex: at >= 0 ? at + 1 : physicalChildren.length,
      });
      continue;
    }

    const at = physicalChildren.indexOf(child.ref.blockId);
    slots.push({
      parentId: physicalParentId,
      insertIndex: at >= 0 ? at + 1 : physicalChildren.length,
    });
  }

  return slots;
}

/** 预览父节点下每个插入槽位（before child[i] / 末尾）对应的物理落点；null 表示不展示。 */
export function listPreviewInsertSlotTargets(
  sourceTemplate: EmailTemplate,
  parentNode: PreviewBlockNode
): (PhysicalInsertTarget | null)[] {
  const parentRef = parentNode.ref;
  const physicalParentId =
    parentRef.kind === "repeat-item" ? parentRef.prototypeRootId : parentRef.blockId;
  const physicalParent = sourceTemplate.blocks[physicalParentId];
  if (!physicalParent || !isCanvasInsertParentBlock(physicalParent)) {
    return Array.from({ length: parentNode.children.length + 1 }, () => null);
  }

  const isRepeatHost =
    parentRef.kind === "physical" &&
    physicalParent.repeat?.mode === "collection" &&
    isRepeatHostBlock(physicalParent);

  if (isRepeatHost) {
    return listRepeatHostPreviewInsertSlotTargets(physicalParent, parentNode.children);
  }

  return listStandardPreviewInsertSlotTargets(sourceTemplate, parentNode);
}

export function canShowCanvasDropSlotAtPreviewIndex(
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel,
  parentPreviewBlockId: string,
  insertIndex: number
): boolean {
  const parentNode = findPreviewNodeByBlockId(previewModel, parentPreviewBlockId);
  if (!parentNode) return false;
  const slots = listPreviewInsertSlotTargets(sourceTemplate, parentNode);
  return Boolean(slots[insertIndex]);
}

export function resolvePhysicalInsertFromPreviewSlot(
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel,
  parentPreviewBlockId: string,
  insertIndex: number
): PhysicalInsertTarget {
  const parentNode = findPreviewNodeByBlockId(previewModel, parentPreviewBlockId);
  if (!parentNode) throw new Error("目标父区块不存在");

  const slots = listPreviewInsertSlotTargets(sourceTemplate, parentNode);
  if (insertIndex < 0 || insertIndex >= slots.length) {
    throw new Error("插入位置无效");
  }
  const target = slots[insertIndex];
  if (!target) {
    throw new Error("此处不可插入");
  }

  const parent = sourceTemplate.blocks[target.parentId];
  if (!isCanvasInsertParentBlock(parent)) {
    throw new Error("目标父区块不支持插入子级");
  }
  const childCount = parent.children?.length ?? 0;
  if (target.insertIndex < 0 || target.insertIndex > childCount) {
    throw new Error("插入位置无效");
  }
  return target;
}

function isStrictDescendantOf(
  template: EmailTemplate,
  ancestorId: string,
  blockId: string
): boolean {
  let parentId = template.blocks[blockId]?.parentId ?? null;
  while (parentId) {
    if (parentId === ancestorId) return true;
    parentId = template.blocks[parentId]?.parentId ?? null;
  }
  return false;
}

/** 拖拽移动时是否展示该预览插入槽（排除自身子树内与等效原位）。 */
export function canShowCanvasDropSlotForMove(
  sourceTemplate: EmailTemplate,
  previewModel: RepeatPreviewModel,
  blockId: string,
  parentPreviewBlockId: string,
  insertIndex: number
): boolean {
  if (!canShowCanvasDropSlotAtPreviewIndex(sourceTemplate, previewModel, parentPreviewBlockId, insertIndex)) {
    return false;
  }
  const block = sourceTemplate.blocks[blockId];
  if (!block?.parentId) return false;

  let target: PhysicalInsertTarget;
  try {
    target = resolvePhysicalInsertFromPreviewSlot(
      sourceTemplate,
      previewModel,
      parentPreviewBlockId,
      insertIndex
    );
  } catch {
    return false;
  }

  if (target.parentId === blockId || isStrictDescendantOf(sourceTemplate, blockId, target.parentId)) {
    return false;
  }

  const oldParent = sourceTemplate.blocks[block.parentId];
  const oldIndex = oldParent?.children?.indexOf(blockId) ?? -1;
  if (oldIndex < 0) return false;

  if (target.parentId === block.parentId) {
    let insertAt = target.insertIndex;
    if (insertAt > oldIndex) insertAt -= 1;
    if (insertAt === oldIndex) return false;
  }

  return true;
}

export function moveBlockToPreviewSlot(args: {
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  blockId: string;
  parentPreviewBlockId: string;
  insertIndex: number;
}): EmailTemplate {
  const { parentId, insertIndex } = resolvePhysicalInsertFromPreviewSlot(
    args.sourceTemplate,
    args.previewModel,
    args.parentPreviewBlockId,
    args.insertIndex
  );
  if (
    !canShowCanvasDropSlotForMove(
      args.sourceTemplate,
      args.previewModel,
      args.blockId,
      args.parentPreviewBlockId,
      args.insertIndex
    )
  ) {
    throw new Error("此处不可移动");
  }
  return moveBlockToParentIndex(args.sourceTemplate, args.blockId, parentId, insertIndex);
}

function insertCatalogBlockAtResolvedTarget(args: {
  template: EmailTemplate;
  parentId: string;
  insertIndex: number;
  entry: BlockCatalogEntry;
  tokenPresets?: TokenPresets | null;
  blockMastersById?: Readonly<Record<string, BlockMaster>> | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const result = insertCatalogBlockAtParentIndex(args);
  const parent = result.template.blocks[args.parentId];
  if (parent) finalizeRepeatHostChildInsert(parent, result.insertedBlockId);
  return result;
}

function insertSectionAtResolvedTarget(args: {
  template: EmailTemplate;
  parentId: string;
  insertIndex: number;
  section: SectionMaster;
  tokenPresets?: TokenPresets | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const result = insertSectionAtParentIndex(args);
  const parent = result.template.blocks[args.parentId];
  if (parent) finalizeRepeatHostChildInsert(parent, result.insertedBlockId);
  return result;
}

export function insertDraggedBlockAtPreviewSlot(args: {
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  parentPreviewBlockId: string;
  insertIndex: number;
  entry: BlockCatalogEntry;
  tokenPresets?: TokenPresets | null;
  blockMastersById?: Readonly<Record<string, BlockMaster>> | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const { parentId, insertIndex } = resolvePhysicalInsertFromPreviewSlot(
    args.sourceTemplate,
    args.previewModel,
    args.parentPreviewBlockId,
    args.insertIndex
  );
  return insertCatalogBlockAtResolvedTarget({
    template: args.sourceTemplate,
    parentId,
    insertIndex,
    entry: args.entry,
    tokenPresets: args.tokenPresets,
    blockMastersById: args.blockMastersById,
  });
}

export function insertDraggedSectionAtPreviewSlot(args: {
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  parentPreviewBlockId: string;
  insertIndex: number;
  section: SectionMaster;
  tokenPresets?: TokenPresets | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const { parentId, insertIndex } = resolvePhysicalInsertFromPreviewSlot(
    args.sourceTemplate,
    args.previewModel,
    args.parentPreviewBlockId,
    args.insertIndex
  );
  return insertSectionAtResolvedTarget({
    template: args.sourceTemplate,
    parentId,
    insertIndex,
    section: args.section,
    tokenPresets: args.tokenPresets,
  });
}
