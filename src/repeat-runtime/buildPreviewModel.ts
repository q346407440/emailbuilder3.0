import type {
  PreviewBlockNode,
  RepeatPreviewModel,
  RepeatRuntimeContext,
  VirtualBlockRef,
} from "../repeat-binding-contract";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { mergeTemplatePayload } from "../lib/merge";
import { isRepeatHostBlock } from "../lib/repeatHostBlock";
import {
  buildRepeatHostExpandedChildren,
  splitRepeatHostStaticSiblingChildren,
} from "../lib/repeatRegion";
import { refToStableKey } from "./repeatVirtualResolver";
import {
  buildRepeatItemContext,
  repeatGroupCount,
  repeatItemsForGroup,
  repeatItemIndexForGroup,
  resolveRepeatItemsForExpansion,
} from "./repeatItemResolve";
import { clonePrototypeSubtreeSnapshot, snapshotBlockIdToPrototypeId } from "./repeatPrototypeSnapshot";
import { formatRepeatItemDisplayName } from "../lib/repeatRegionTreeTags";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRepeatManagedChildId(
  childId: string,
  repeat: NonNullable<EmailBlock["repeat"]>
): boolean {
  return repeat.prototypeChildIds.includes(childId) || repeat.fallbackChildIds.includes(childId);
}

function virtualizeRepeatHostChildNodes(
  node: PreviewBlockNode,
  template: EmailTemplate,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[]
): PreviewBlockNode[] {
  const protoId =
    node.ref.kind === "physical" ? node.ref.blockId : node.ref.prototypeRootId;
  const source = template.blocks[protoId];
  const repeat = source?.repeat;
  if (!source || repeat?.mode !== "collection" || !isRepeatHostBlock(source)) {
    return [virtualizeNestedRepeatPreviewNode(node, template, payload, contexts)];
  }

  const items = resolveRepeatItemsForExpansion(repeat, payload, contexts);
  const selfRepeat =
    repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === protoId;

  if (selfRepeat) {
    return Array.from({ length: repeatGroupCount(repeat, items.length) }).flatMap((_, groupIndex) => {
      const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
      const item = groupItems[0];
      const ctxItem = isRecord(item) ? item : {};
      const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
      const { itemPath, nextContexts } = buildRepeatItemContext(
        repeat,
        contexts,
        ctxItem,
        itemPathIndex
      );
      const itemNode = buildRepeatItemPreviewNode({
        template,
        payload,
        hostId: protoId,
        prototypeRootId: protoId,
        repeat,
        item: ctxItem,
        groupItems,
        itemIndex: groupIndex,
        itemPath,
        contextStack: nextContexts,
      });
      return itemNode
        ? [virtualizeNestedRepeatPreviewNode(itemNode, template, payload, nextContexts)]
        : [];
    });
  }

  const expandedMiddle: PreviewBlockNode[] = [];
  Array.from({ length: repeatGroupCount(repeat, items.length) }).forEach((_, groupIndex) => {
    const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
    const item = groupItems[0];
    const ctxItem = isRecord(item) ? item : {};
    const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
    const { itemPath, nextContexts } = buildRepeatItemContext(
      repeat,
      contexts,
      ctxItem,
      itemPathIndex
    );
    for (const prototypeChildId of repeat.prototypeChildIds) {
      const itemNode = buildRepeatItemPreviewNode({
        template,
        payload,
        hostId: protoId,
        prototypeRootId: prototypeChildId,
        repeat,
        item: ctxItem,
        groupItems,
        itemIndex: groupIndex,
        itemPath,
        contextStack: nextContexts,
      });
      if (itemNode) {
        expandedMiddle.push(
          virtualizeNestedRepeatPreviewNode(itemNode, template, payload, nextContexts)
        );
      }
    }
  });
  return expandedMiddle;
}

function virtualizeNestedRepeatPreviewNode(
  node: PreviewBlockNode,
  template: EmailTemplate,
  payload: EmailPayload | null,
  contexts: RepeatRuntimeContext[]
): PreviewBlockNode {
  if (node.ref.kind === "repeat-item") {
    return {
      ...node,
      children: node.children.flatMap((child) => {
        const childContexts =
          child.ref.kind === "repeat-item" ? child.ref.contextStack : contexts;
        const protoId =
          child.ref.kind === "physical" ? child.ref.blockId : child.ref.prototypeRootId;
        const source = template.blocks[protoId];
        if (source?.repeat?.mode === "collection" && isRepeatHostBlock(source)) {
          return virtualizeRepeatHostChildNodes(child, template, payload, childContexts);
        }
        return [virtualizeNestedRepeatPreviewNode(child, template, payload, childContexts)];
      }),
    };
  }

  const protoId = node.ref.blockId;
  const source = template.blocks[protoId];
  const repeat = source?.repeat;

  if (repeat?.mode === "collection" && isRepeatHostBlock(source!)) {
    const items = resolveRepeatItemsForExpansion(repeat, payload, contexts);
    const selfRepeat =
      repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === protoId;

    if (selfRepeat) {
      const expandedSiblings: PreviewBlockNode[] = [];
      Array.from({ length: repeatGroupCount(repeat, items.length) }).forEach((_, groupIndex) => {
        const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
        const item = groupItems[0];
        const ctxItem = isRecord(item) ? item : {};
        const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
        const { itemPath, nextContexts } = buildRepeatItemContext(
          repeat,
          contexts,
          ctxItem,
          itemPathIndex
        );
        const itemNode = buildRepeatItemPreviewNode({
          template,
          payload,
          hostId: protoId,
          prototypeRootId: protoId,
          repeat,
          item: ctxItem,
          groupItems,
          itemIndex: groupIndex,
          itemPath,
          contextStack: nextContexts,
        });
        if (itemNode) {
          expandedSiblings.push(
            virtualizeNestedRepeatPreviewNode(itemNode, template, payload, nextContexts)
          );
        }
      });
      return {
        ...node,
        block: { ...node.block, children: expandedSiblings.map((n) => n.block.id) },
        children: expandedSiblings,
      };
    }

    if (!selfRepeat) {
      const expandedMiddle: PreviewBlockNode[] = [];
      Array.from({ length: repeatGroupCount(repeat, items.length) }).forEach((_, groupIndex) => {
        const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
        const item = groupItems[0];
        const ctxItem = isRecord(item) ? item : {};
        const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
        const { itemPath, nextContexts } = buildRepeatItemContext(
          repeat,
          contexts,
          ctxItem,
          itemPathIndex
        );
        for (const prototypeChildId of repeat.prototypeChildIds) {
          const itemNode = buildRepeatItemPreviewNode({
            template,
            payload,
            hostId: protoId,
            prototypeRootId: prototypeChildId,
            repeat,
            item: ctxItem,
            groupItems,
            itemIndex: groupIndex,
            itemPath,
            contextStack: nextContexts,
          });
          if (itemNode) expandedMiddle.push(virtualizeNestedRepeatPreviewNode(itemNode, template, payload, nextContexts));
        }
      });

      const originalChildren = source.children ?? [];
      const { before, after } = splitRepeatHostStaticSiblingChildren(originalChildren, repeat);
      const beforeNodes = before.flatMap((id) => {
        const n = buildPreviewNode(template, payload, id, contexts);
        return n ? [virtualizeNestedRepeatPreviewNode(n, template, payload, contexts)] : [];
      });
      const afterNodes = after.flatMap((id) => {
        const n = buildPreviewNode(template, payload, id, contexts);
        return n ? [virtualizeNestedRepeatPreviewNode(n, template, payload, contexts)] : [];
      });

      const hostBlock = clone(source);
      hostBlock.id = node.block.id;
      hostBlock.parentId = node.block.parentId;
      hostBlock.children = buildRepeatHostExpandedChildren(
        originalChildren,
        repeat,
        expandedMiddle.map((n) => n.block.id)
      );

      return {
        ref: node.ref,
        block: hostBlock,
        children: [...beforeNodes, ...expandedMiddle, ...afterNodes],
      };
    }
  }

  return {
    ...node,
    children: node.children.map((child) => {
      const childContexts =
        child.ref.kind === "repeat-item" ? child.ref.contextStack : contexts;
      return virtualizeNestedRepeatPreviewNode(child, template, payload, childContexts);
    }),
  };
}

function buildRepeatItemPreviewNode(opts: {
  template: EmailTemplate;
  payload: EmailPayload | null;
  hostId: string;
  prototypeRootId: string;
  repeat: NonNullable<EmailBlock["repeat"]>;
  item: Record<string, unknown>;
  groupItems?: Record<string, unknown>[];
  itemIndex: number;
  itemPath: string;
  contextStack: RepeatRuntimeContext[];
}): PreviewBlockNode | null {
  const itemRef: VirtualBlockRef = {
    kind: "repeat-item",
    hostId: opts.hostId,
    prototypeRootId: opts.prototypeRootId,
    itemIndex: opts.itemIndex,
    contextStack: opts.contextStack,
  };
  const snapshot = clonePrototypeSubtreeSnapshot({
    sourceTemplate: opts.template,
    sourceId: opts.prototypeRootId,
    parentId: opts.hostId,
    snapshotBlockId: opts.prototypeRootId,
    repeatHostSourceId: opts.hostId,
    repeat: opts.repeat,
    item: opts.item,
    groupItems: opts.groupItems,
    itemPath: opts.itemPath,
    itemIndex: opts.itemIndex,
    materializeRepeatItemBindings: false,
    contextStack: opts.contextStack,
  });
  if (!snapshot) return null;

  const visitSnapshot = (blockId: string, ref: VirtualBlockRef): PreviewBlockNode => {
    const src = snapshot!.blocks[blockId]!;
    const stableId = refToStableKey(ref);
    const block = clone(src);
    block.id = stableId;
    const children = (src.children ?? []).map((childId) => {
        const childProtoId = snapshotBlockIdToPrototypeId(childId, opts.prototypeRootId);
        const childRef: VirtualBlockRef =
          ref.kind === "repeat-item"
            ? {
                kind: "repeat-item",
                hostId: ref.hostId,
                prototypeRootId: childProtoId,
                itemIndex: ref.itemIndex,
                contextStack: ref.contextStack,
              }
            : { kind: "physical", blockId: childProtoId };
      return visitSnapshot(childId, childRef);
    });
    block.children = children.map((c) => c.block.id);
    block.parentId = stableId === refToStableKey(itemRef) ? opts.hostId : null;

    const node: PreviewBlockNode = { ref, block, children: [] };
    node.children = children.map((child) => ({
      ...child,
      block: { ...child.block, parentId: stableId },
    }));

    return node;
  };

  const root = visitSnapshot(snapshot.rootId, itemRef);
  root.ref = itemRef;
  root.block.id = refToStableKey(itemRef);
  return virtualizeNestedRepeatPreviewNode(root, opts.template, opts.payload, opts.contextStack);
}

function buildPreviewNode(
  template: EmailTemplate,
  payload: EmailPayload | null,
  blockId: string,
  contexts: RepeatRuntimeContext[]
): PreviewBlockNode | null {
  const sourceBlock = template.blocks[blockId];
  if (!sourceBlock) return null;

  const ref: VirtualBlockRef = { kind: "physical", blockId };
  const repeat = sourceBlock.repeat;

  if (repeat?.mode === "collection" && isRepeatHostBlock(sourceBlock)) {
    const items = resolveRepeatItemsForExpansion(repeat, payload, contexts);
    const selfRepeat =
      repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === blockId;

    if (selfRepeat) {
      // self-repeat 不在此处产出节点；由父级 buildPreviewChildren 展开为 N 个 repeat-item
      return null;
    }

    const originalChildren = sourceBlock.children ?? [];
    const expandedMiddle: PreviewBlockNode[] = [];

    Array.from({ length: repeatGroupCount(repeat, items.length) }).forEach((_, groupIndex) => {
      const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
      const item = groupItems[0];
      const ctxItem = isRecord(item) ? item : {};
      const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
      const { itemPath, nextContexts } = buildRepeatItemContext(
        repeat,
        contexts,
        ctxItem,
        itemPathIndex
      );
      for (const prototypeChildId of repeat.prototypeChildIds) {
        const itemNode = buildRepeatItemPreviewNode({
          template,
          payload,
          hostId: blockId,
          prototypeRootId: prototypeChildId,
          repeat,
          item: ctxItem,
          groupItems,
          itemIndex: groupIndex,
          itemPath,
          contextStack: nextContexts,
        });
        if (itemNode) expandedMiddle.push(itemNode);
      }
    });

    const { before, after } = splitRepeatHostStaticSiblingChildren(originalChildren, repeat);
    const beforeNodes = before.flatMap((id) => {
      const n = buildPreviewNode(template, payload, id, contexts);
      return n ? [n] : [];
    });
    const afterNodes = after.flatMap((id) => {
      const n = buildPreviewNode(template, payload, id, contexts);
      return n ? [n] : [];
    });

    const hostBlock = clone(sourceBlock);
    hostBlock.id = refToStableKey(ref);
    hostBlock.children = buildRepeatHostExpandedChildren(
      originalChildren,
      repeat,
      expandedMiddle.map((n) => n.block.id)
    );

    return {
      ref,
      block: hostBlock,
      children: [...beforeNodes, ...expandedMiddle, ...afterNodes],
    };
  }

  const childIds = sourceBlock.children ?? [];
  const children = buildPreviewChildren(template, payload, childIds, contexts, blockId);

  const block = clone(sourceBlock);
  block.id = refToStableKey(ref);
  block.children = children.map((c) => c.block.id);
  return { ref, block, children };
}

function buildPreviewChildren(
  template: EmailTemplate,
  payload: EmailPayload | null,
  childIds: string[],
  contexts: RepeatRuntimeContext[],
  parentBlockId: string
): PreviewBlockNode[] {
  const result: PreviewBlockNode[] = [];

  for (const childId of childIds) {
    const childBlock = template.blocks[childId];
    if (!childBlock) continue;

    const repeat = childBlock.repeat;
    if (repeat?.mode === "collection" && isRepeatHostBlock(childBlock)) {
      const selfRepeat =
        repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === childId;
      if (selfRepeat) {
        const items = resolveRepeatItemsForExpansion(repeat, payload, contexts);
        Array.from({ length: repeatGroupCount(repeat, items.length) }).forEach((_, groupIndex) => {
          const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
          const item = groupItems[0];
          const ctxItem = isRecord(item) ? item : {};
          const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
          const { itemPath, nextContexts } = buildRepeatItemContext(
            repeat,
            contexts,
            ctxItem,
            itemPathIndex
          );
          const itemNode = buildRepeatItemPreviewNode({
            template,
            payload,
            hostId: childId,
            prototypeRootId: childId,
            repeat,
            item: ctxItem,
            groupItems,
            itemIndex: groupIndex,
            itemPath,
            contextStack: nextContexts,
          });
          if (itemNode) {
            itemNode.block.parentId = parentBlockId;
            result.push(itemNode);
          }
        });
        continue;
      }
    }

    const parentRepeat = template.blocks[parentBlockId]?.repeat;
    if (parentRepeat && isRepeatManagedChildId(childId, parentRepeat)) {
      continue;
    }

    const node = buildPreviewNode(template, payload, childId, contexts);
    if (node) {
      node.block.parentId = parentBlockId;
      result.push(node);
    }
  }

  return result;
}

/** 将 PreviewBlockNode 树展平为 EmailTemplate（供 merge / theme 解析） */
export function previewModelToFlatTemplate(
  model: RepeatPreviewModel,
  sourceTemplate: EmailTemplate
): EmailTemplate {
  const blocks: EmailTemplate["blocks"] = {};
  const blockMeta: NonNullable<EmailTemplate["blockMeta"]> = { ...sourceTemplate.blockMeta };

  const visit = (node: PreviewBlockNode, parentId: string | null) => {
    const block = clone(node.block);
    block.parentId = parentId;
    block.children = node.children.map((c) => c.block.id);
    blocks[block.id] = block;

    const physicalId =
      node.ref.kind === "physical" ? node.ref.blockId : node.ref.prototypeRootId;
    const meta = sourceTemplate.blockMeta?.[physicalId];
    if (meta) {
      blockMeta[block.id] =
        node.ref.kind === "repeat-item" && meta.name
          ? { ...meta, name: formatRepeatItemDisplayName(meta.name, node.ref.itemIndex) }
          : meta;
    }

    for (const child of node.children) {
      visit(child, block.id);
    }
  };

  visit(model.root, null);
  return {
    ...sourceTemplate,
    rootBlockId: model.root.block.id,
    blocks,
    blockMeta,
  };
}

/** 在 flat merge 后将合并结果写回 preview 节点 block 快照 */
export function applyMergedBlocksToPreviewModel(
  model: RepeatPreviewModel,
  merged: EmailTemplate
): RepeatPreviewModel {
  const visit = (node: PreviewBlockNode): PreviewBlockNode => ({
    ...node,
    block: merged.blocks[node.block.id] ? clone(merged.blocks[node.block.id]!) : node.block,
    children: node.children.map(visit),
  });
  return { root: visit(model.root) };
}

/**
 * 构建 repeat 虚拟预览模型（不落盘、不污染 template.blocks）。
 */
export function buildRepeatPreviewModel(
  template: EmailTemplate,
  payload: EmailPayload | null
): RepeatPreviewModel {
  const rootNode = buildPreviewNode(template, payload, template.rootBlockId, []);
  if (!rootNode) {
    const rootBlock = template.blocks[template.rootBlockId];
    const ref: VirtualBlockRef = { kind: "physical", blockId: template.rootBlockId };
    return {
      root: {
        ref,
        block: rootBlock
          ? { ...clone(rootBlock), id: refToStableKey(ref) }
          : ({
              id: refToStableKey(ref),
              type: "emailRoot",
              parentId: null,
              children: [],
              props: {},
            } as EmailBlock),
        children: [],
      },
    };
  }

  const flat = previewModelToFlatTemplate({ root: rootNode }, template);
  const merged = mergeTemplatePayload(flat, payload);
  return applyMergedBlocksToPreviewModel({ root: rootNode }, merged);
}

/** 在预览模型中按 ref 查找节点 */
export function findPreviewNodeByRef(
  model: RepeatPreviewModel,
  ref: VirtualBlockRef
): PreviewBlockNode | null {
  const key = refToStableKey(ref);
  const visit = (node: PreviewBlockNode): PreviewBlockNode | null => {
    if (refToStableKey(node.ref) === key) return node;
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(model.root);
}

/** 预览模型 blockMeta（BlockTree 用） */
export function buildPreviewBlockMeta(
  model: RepeatPreviewModel,
  sourceTemplate: EmailTemplate
): NonNullable<EmailTemplate["blockMeta"]> {
  return previewModelToFlatTemplate(model, sourceTemplate).blockMeta ?? {};
}

/** 对预览模型各节点 block 快照做 $themeRef 烘焙 */
export function applyThemeToPreviewModel(
  model: RepeatPreviewModel,
  resolveBlock: (block: EmailBlock) => EmailBlock
): RepeatPreviewModel {
  const visit = (node: PreviewBlockNode): PreviewBlockNode => ({
    ...node,
    block: resolveBlock(node.block),
    children: node.children.map(visit),
  });
  return { root: visit(model.root) };
}
