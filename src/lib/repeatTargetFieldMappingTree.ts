import type { EmailTemplate } from "../types/email";
import { blockTypeLabel } from "./blockTypeLabel";
import { repeatMappingBlockDisplayName, repeatMappingFieldShortLabel } from "./repeatMappableContentBindPaths";

/** 与区块树一致：「区块名 · 类型」 */
export function repeatMappingBlockTreeLabel(template: EmailTemplate, blockId: string): string {
  const block = template.blocks[blockId];
  const name = repeatMappingBlockDisplayName(template, blockId);
  const typeLabel = blockTypeLabel(block?.type ?? "");
  if (name && typeLabel) return `${name} · ${typeLabel}`;
  return name || typeLabel || blockId;
}

export type RepeatTargetFieldOptionLike = {
  key: string;
  blockId: string;
  bindPath: string;
  label: string;
};

/** 分组层级：容器区块 → 可映射内容块 → 配置项（bindPath） */
export type RepeatTargetFieldGroupTier = "container" | "contentBlock";

export type RepeatTargetFieldGroupEntry = {
  kind: "group";
  tier: RepeatTargetFieldGroupTier;
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

function pushContentBlockGroup(
  entries: RepeatTargetFieldNavEntry[],
  template: EmailTemplate,
  blockId: string,
  depth: number
) {
  entries.push({
    kind: "group",
    tier: "contentBlock",
    key: `content:${blockId}`,
    blockId,
    depth,
    label: repeatMappingBlockTreeLabel(template, blockId),
  });
}

function pushConfigItemLeaves(
  entries: RepeatTargetFieldNavEntry[],
  blockTargets: ReadonlyArray<RepeatTargetFieldOptionLike>,
  depth: number
) {
  for (const target of blockTargets) {
    entries.push({
      kind: "leaf",
      key: target.key,
      blockId: target.blockId,
      bindPath: target.bindPath,
      depth,
      label: repeatMappingFieldShortLabel(target.bindPath),
    });
  }
}

/**
 * 字段映射左侧导航：容器区块 → 内容块 → 配置项（bindPath）。
 * 从行模板第二层（根的子区块）起按区块树分层；单字段也不再压平为「块名即叶子」。
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

  const visit = (blockId: string, depth: number) => {
    if (!subtreeIds.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    const blockTargets = byBlock.get(blockId) ?? [];
    const childIds = block.children.filter((id) => subtreeIds.has(id));
    const hasChildBlocks = childIds.length > 0;
    const hasMappableFields = blockTargets.length > 0;

    if (hasChildBlocks) {
      entries.push({
        kind: "group",
        tier: "container",
        key: `block:${blockId}`,
        blockId,
        depth,
        label: repeatMappingBlockTreeLabel(template, blockId),
      });
      const innerDepth = depth + 1;
      if (hasMappableFields) {
        pushContentBlockGroup(entries, template, blockId, innerDepth);
        pushConfigItemLeaves(entries, blockTargets, innerDepth + 1);
      }
      for (const childId of childIds) {
        visit(childId, innerDepth);
      }
      return;
    }

    if (hasMappableFields) {
      pushContentBlockGroup(entries, template, blockId, depth);
      pushConfigItemLeaves(entries, blockTargets, depth + 1);
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
