import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { mergeTemplatePayload } from "../lib/merge";
import { isRepeatHostBlock } from "../lib/repeatHostBlock";
import {
  buildRepeatItemContext,
  repeatGroupCount,
  repeatItemsForGroup,
  repeatItemIndexForGroup,
  resolveRepeatItemsForExpansion,
} from "./repeatItemResolve";
import {
  clonePrototypeSubtreeSnapshot,
  finalizeMaterializedStaticBlock,
  remapSnapshotBlocksToPrototypeIds,
  type PrototypeSubtreeSnapshot,
} from "./repeatPrototypeSnapshot";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 解绑物化：单行 merge 后的子树 snapshot（不写全局 template.blocks） */
export type RepeatItemMaterializationSnapshot = {
  itemIndex: number;
  /** 物化后写入宿主 children 的顶层 block id（原型 id 空间） */
  rootBlockIds: string[];
  blocks: Record<string, EmailBlock>;
  blockMeta: NonNullable<EmailTemplate["blockMeta"]>;
};

function snapshotToMiniTemplate(
  snapshot: PrototypeSubtreeSnapshot,
  sourceTemplate: EmailTemplate
): EmailTemplate {
  return {
    ...sourceTemplate,
    rootBlockId: snapshot.rootId,
    blocks: snapshot.blocks,
    blockMeta: { ...sourceTemplate.blockMeta, ...snapshot.blockMeta },
  };
}

/**
 * 按 payload 项数逐行产出 merge 后的物化 snapshot（解绑专用，不 expand 进全局 blocks）。
 */
export function buildRepeatItemMaterializationSnapshots(
  template: EmailTemplate,
  payload: EmailPayload | null,
  hostId: string
): RepeatItemMaterializationSnapshot[] {
  const host = template.blocks[hostId];
  const repeat = host?.repeat;
  if (!host || repeat?.mode !== "collection" || !isRepeatHostBlock(host)) {
    return [];
  }

  const selfRepeat =
    repeat.prototypeChildIds.length === 1 && repeat.prototypeChildIds[0] === hostId;
  const items = resolveRepeatItemsForExpansion(repeat, payload, []);
  const snapshots: RepeatItemMaterializationSnapshot[] = [];

  Array.from({ length: repeatGroupCount(repeat, items.length) }).forEach((_, groupIndex) => {
    const groupItems = repeatItemsForGroup(repeat, items, groupIndex);
    const item = groupItems[0];
    const ctxItem = isRecord(item) ? item : {};
    const itemPathIndex = repeatItemIndexForGroup(repeat, groupIndex);
    const { itemPath } = buildRepeatItemContext(repeat, [], ctxItem, itemPathIndex);
    const rootBlockIds: string[] = [];
    const allBlocks: Record<string, EmailBlock> = {};
    const allMeta: NonNullable<EmailTemplate["blockMeta"]> = {};

    const prototypeIds = selfRepeat ? [hostId] : repeat.prototypeChildIds;

    for (const prototypeRootId of prototypeIds) {
      const rawSnapshot = clonePrototypeSubtreeSnapshot({
        sourceTemplate: template,
        sourceId: prototypeRootId,
        parentId: hostId,
        snapshotBlockId: prototypeRootId,
        repeatHostSourceId: hostId,
        repeat,
        item: ctxItem,
        groupItems,
        itemPath,
        itemIndex: groupIndex,
        materializeRepeatItemBindings: true,
      });
      if (!rawSnapshot) continue;

      const remapped = remapSnapshotBlocksToPrototypeIds(rawSnapshot, prototypeRootId);
      const mini = snapshotToMiniTemplate(remapped, template);
      const merged = mergeTemplatePayload(mini, payload ?? { schemaVersion: "1.0.0", slots: {}, values: {} });

      for (const [id, block] of Object.entries(merged.blocks)) {
        finalizeMaterializedStaticBlock(block);
        delete block.repeat;
        allBlocks[id] = block;
      }
      Object.assign(allMeta, merged.blockMeta ?? remapped.blockMeta);
      rootBlockIds.push(remapped.rootId);
    }

    if (rootBlockIds.length > 0) {
      snapshots.push({
        itemIndex: groupIndex,
        rootBlockIds,
        blocks: allBlocks,
        blockMeta: allMeta,
      });
    }
  });

  return snapshots;
}
