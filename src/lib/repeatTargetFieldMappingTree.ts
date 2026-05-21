import type { EmailTemplate } from "../types/email";
import {
  repeatMappingBlockDisplayName,
  repeatMappingFieldShortLabel,
  repeatMappingTabLabel,
} from "./repeatMappableContentBindPaths";

export type RepeatTargetFieldOptionLike = {
  key: string;
  blockId: string;
  bindPath: string;
  label: string;
};

export type RepeatTargetFieldGroupEntry = {
  kind: "group";
  key: string;
  blockId: string;
  depth: number;
  label: string;
};

export type RepeatTargetFieldLeafEntry = {
  kind: "leaf";
  key: string;
  blockId: string;
  bindPath: string;
  depth: number;
  label: string;
};

export type RepeatTargetFieldNavEntry = RepeatTargetFieldGroupEntry | RepeatTargetFieldLeafEntry;

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

function collectSubtreeBlockIdSet(template: EmailTemplate, rootIds: string[]): Set<string> {
  return new Set(collectSubtreeBlockIds(template, rootIds));
}

/** 行模板子树默认展开所有含子区块的分组 */
export function defaultExpandedRepeatTargetGroups(
  entries: ReadonlyArray<RepeatTargetFieldNavEntry>
): Set<string> {
  return new Set(entries.filter((e) => e.kind === "group").map((e) => e.key));
}

/** 左侧导航起点：行模板根的直接子区块（不展示行模板根那一层） */
function repeatTargetNavStartBlockIds(
  template: EmailTemplate,
  prototypeChildIds: string[],
  subtreeIds: ReadonlySet<string>
): string[] {
  const starts: string[] = [];
  for (const rootId of prototypeChildIds) {
    if (!subtreeIds.has(rootId)) continue;
    const block = template.blocks[rootId];
    if (!block) continue;
    const childIds = block.children.filter((id) => subtreeIds.has(id));
    if (childIds.length > 0) {
      starts.push(...childIds);
    } else {
      starts.push(rootId);
    }
  }
  return starts;
}

/**
 * 字段映射左侧导航：从行模板第二层（根的子区块）起按区块树分层展示。
 */
export function flattenRepeatTargetFieldsForNav(
  template: EmailTemplate,
  prototypeChildIds: string[],
  targets: ReadonlyArray<RepeatTargetFieldOptionLike>
): RepeatTargetFieldNavEntry[] {
  if (!targets.length) return [];
  const subtreeIds = collectSubtreeBlockIdSet(template, prototypeChildIds);
  const byBlock = new Map<string, RepeatTargetFieldOptionLike[]>();
  for (const target of targets) {
    const list = byBlock.get(target.blockId) ?? [];
    list.push(target);
    byBlock.set(target.blockId, list);
  }

  const entries: RepeatTargetFieldNavEntry[] = [];
  const allTargets = targets.map((t) => ({ blockId: t.blockId, bindPath: t.bindPath }));

  const visit = (blockId: string, depth: number) => {
    if (!subtreeIds.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    const blockTargets = byBlock.get(blockId) ?? [];
    const childIds = block.children.filter((id) => subtreeIds.has(id));
    const hasChildBlocks = childIds.length > 0;
    const multiFields = blockTargets.length > 1;
    const groupKey = `block:${blockId}`;

    if (hasChildBlocks || multiFields) {
      entries.push({
        kind: "group",
        key: groupKey,
        blockId,
        depth,
        label: repeatMappingBlockDisplayName(template, blockId),
      });
      const leafDepth = depth + 1;
      for (const target of blockTargets) {
        entries.push({
          kind: "leaf",
          key: target.key,
          blockId: target.blockId,
          bindPath: target.bindPath,
          depth: leafDepth,
          label: multiFields
            ? repeatMappingFieldShortLabel(target.bindPath)
            : repeatMappingTabLabel(template, target.blockId, target.bindPath, allTargets),
        });
      }
      for (const childId of childIds) {
        visit(childId, leafDepth);
      }
      return;
    }

    if (blockTargets.length === 1) {
      const target = blockTargets[0]!;
      entries.push({
        kind: "leaf",
        key: target.key,
        blockId: target.blockId,
        bindPath: target.bindPath,
        depth,
        label: repeatMappingTabLabel(template, target.blockId, target.bindPath, allTargets),
      });
      for (const childId of childIds) {
        visit(childId, depth);
      }
      return;
    }

    if (hasChildBlocks) {
      entries.push({
        kind: "group",
        key: groupKey,
        blockId,
        depth,
        label: repeatMappingBlockDisplayName(template, blockId),
      });
      for (const childId of childIds) {
        visit(childId, depth + 1);
      }
    }
  };

  for (const startId of repeatTargetNavStartBlockIds(template, prototypeChildIds, subtreeIds)) {
    visit(startId, 0);
  }
  return entries;
}

export function findRepeatTargetLeafByKey(
  entries: ReadonlyArray<RepeatTargetFieldNavEntry>,
  key: string
): RepeatTargetFieldLeafEntry | undefined {
  const leaf = entries.find((e): e is RepeatTargetFieldLeafEntry => e.kind === "leaf" && e.key === key);
  return leaf;
}

export function firstRepeatTargetLeafKey(
  entries: ReadonlyArray<RepeatTargetFieldNavEntry>
): string {
  const leaf = entries.find((e): e is RepeatTargetFieldLeafEntry => e.kind === "leaf");
  return leaf?.key ?? "";
}

export function repeatTargetGroupHasChildMapping(
  groupKey: string,
  entries: ReadonlyArray<RepeatTargetFieldNavEntry>,
  mappingDraft: Record<string, string>
): boolean {
  const startIdx = entries.findIndex((e) => e.kind === "group" && e.key === groupKey);
  if (startIdx < 0) return false;
  const groupDepth = (entries[startIdx] as RepeatTargetFieldGroupEntry).depth;
  for (let i = startIdx + 1; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.kind === "group" && entry.depth <= groupDepth) break;
    if (entry.kind === "leaf" && mappingDraft[entry.key]?.trim()) return true;
  }
  return false;
}
