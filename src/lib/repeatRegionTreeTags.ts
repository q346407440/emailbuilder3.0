import type { VirtualBlockRef } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import { isRepeatHostBlock } from "./repeatHostBlock";

/** 单模板内列表重复组上限；按宿主出现顺序循环取色 */
export const REPEAT_REGION_TREE_TAG_COLOR_COUNT = 10;

export type RepeatTreeTagRole = "host" | "prototype" | "repeat-item";

export type RepeatTreeTagPalette = {
  border: string;
  background: string;
  text: string;
};

/** 区块树列表重复 tag 预设色（同一宿主/组共用一色） */
export const REPEAT_REGION_TREE_TAG_PALETTE: readonly RepeatTreeTagPalette[] = [
  { border: "#2563eb", background: "#eff6ff", text: "#1d4ed8" },
  { border: "#7c3aed", background: "#f5f3ff", text: "#6d28d9" },
  { border: "#059669", background: "#ecfdf5", text: "#047857" },
  { border: "#d97706", background: "#fffbeb", text: "#b45309" },
  { border: "#db2777", background: "#fdf2f8", text: "#be185d" },
  { border: "#0891b2", background: "#ecfeff", text: "#0e7490" },
  { border: "#4f46e5", background: "#eef2ff", text: "#4338ca" },
  { border: "#65a30d", background: "#f7fee7", text: "#4d7c0f" },
  { border: "#c2410c", background: "#fff7ed", text: "#9a3412" },
  { border: "#475569", background: "#f8fafc", text: "#334155" },
] as const;

export type RepeatTreeBlockTag = {
  /** repeat 宿主 blockId，用作分组键 */
  groupKey: string;
  role: RepeatTreeTagRole;
  colorIndex: number;
  slotId: string;
  slotLabel: string;
  prototypeChildIds: string[];
  /** 重复项序号（0-based），仅 repeat-item */
  itemIndex?: number;
};

export type RepeatRegionTreeTagIndex = {
  byBlockId: Map<string, RepeatTreeBlockTag>;
  hosts: RepeatTreeHostInfo[];
};

export type RepeatTreeHostInfo = {
  hostId: string;
  colorIndex: number;
  slotId: string;
  slotLabel: string;
  prototypeChildIds: string[];
};

/** 去掉名称末尾已存在的「（第 N 项）」后缀，避免虚拟预览与物化行重复拼接 */
const REPEAT_ITEM_DISPLAY_SUFFIX_RE = /(?:（第 \d+ 项）)+$/u;

export function stripRepeatItemDisplaySuffix(name: string): string {
  return name.replace(REPEAT_ITEM_DISPLAY_SUFFIX_RE, "").trim();
}

/** 列表重复展开行在区块树/预览中的展示名（第 1 项不加后缀） */
export function formatRepeatItemDisplayName(baseName: string, itemIndex: number): string {
  const base = stripRepeatItemDisplaySuffix(baseName);
  if (itemIndex <= 0 || !base) return base;
  return `${base}（第 ${itemIndex + 1} 项）`;
}

function parseMaterializedRepeatRowBlockId(
  blockId: string,
  prototypeIdSet: Set<string>
): { prototypeId: string; itemIndex: number } | null {
  const match = blockId.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  const prototypeId = match[1]!;
  if (!prototypeIdSet.has(prototypeId)) return null;
  const itemIndex = Number(match[2]) - 1;
  if (!Number.isFinite(itemIndex) || itemIndex < 0) return null;
  return { prototypeId, itemIndex };
}

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  return template.blockMeta?.[blockId]?.name?.trim() || blockId;
}

function hostInfoFor(
  template: EmailTemplate,
  hostId: string,
  colorIndex: number
): RepeatTreeHostInfo | null {
  const host = template.blocks[hostId];
  const repeat = host?.repeat;
  if (!host || repeat?.mode !== "collection" || !isRepeatHostBlock(host)) return null;
  return {
    hostId,
    colorIndex,
    slotId: repeat.slotId,
    slotLabel: repeat.label?.trim() || repeat.slotId,
    prototypeChildIds: [...repeat.prototypeChildIds],
  };
}

/**
 * 为区块树构建列表重复 tag 索引（宿主 / 行模板 / 物化行）。
 * 虚拟 repeat-item 由 BlockTree 按 VirtualBlockRef 直接标注。
 */
export function buildRepeatRegionTreeTagIndex(template: EmailTemplate): RepeatRegionTreeTagIndex {
  const byBlockId = new Map<string, RepeatTreeBlockTag>();
  const hostIds = Object.entries(template.blocks)
    .filter(([, block]) => block.repeat?.mode === "collection" && isRepeatHostBlock(block))
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));

  const hosts: RepeatTreeHostInfo[] = [];
  const prototypeIdSet = new Set<string>();

  for (let i = 0; i < hostIds.length; i++) {
    const hostId = hostIds[i]!;
    const info = hostInfoFor(template, hostId, i % REPEAT_REGION_TREE_TAG_COLOR_COUNT);
    if (!info) continue;
    hosts.push(info);
    for (const prototypeId of info.prototypeChildIds) {
      prototypeIdSet.add(prototypeId);
    }

    const baseTag = {
      groupKey: hostId,
      colorIndex: info.colorIndex,
      slotId: info.slotId,
      slotLabel: info.slotLabel,
      prototypeChildIds: info.prototypeChildIds,
    };

    byBlockId.set(hostId, { ...baseTag, role: "host" });

    for (const prototypeId of info.prototypeChildIds) {
      if (!template.blocks[prototypeId]) continue;
      byBlockId.set(prototypeId, { ...baseTag, role: "prototype" });
    }
  }

  for (const blockId of Object.keys(template.blocks)) {
    if (byBlockId.has(blockId)) continue;

    const materialized = parseMaterializedRepeatRowBlockId(blockId, prototypeIdSet);
    if (!materialized) continue;

    const hostEntry = hosts.find((h) => h.prototypeChildIds.includes(materialized.prototypeId));
    if (!hostEntry) continue;

    byBlockId.set(blockId, {
      groupKey: hostEntry.hostId,
      role: "repeat-item",
      colorIndex: hostEntry.colorIndex,
      slotId: hostEntry.slotId,
      slotLabel: hostEntry.slotLabel,
      prototypeChildIds: hostEntry.prototypeChildIds,
      itemIndex: materialized.itemIndex,
    });
  }

  return { byBlockId, hosts };
}

export function repeatTreeTagPalette(colorIndex: number): RepeatTreeTagPalette {
  return REPEAT_REGION_TREE_TAG_PALETTE[
    ((colorIndex % REPEAT_REGION_TREE_TAG_COLOR_COUNT) + REPEAT_REGION_TREE_TAG_COLOR_COUNT) %
      REPEAT_REGION_TREE_TAG_COLOR_COUNT
  ]!;
}

export function repeatColorIndexForHost(template: EmailTemplate, hostId: string): number {
  return buildRepeatRegionTreeTagIndex(template).hosts.find((h) => h.hostId === hostId)?.colorIndex ?? 0;
}

export function repeatTreeTagRoleLabel(role: RepeatTreeTagRole): string {
  switch (role) {
    case "host":
      return "列表";
    case "prototype":
      return "行模板";
    case "repeat-item":
      return "重复";
  }
}

export function repeatTreeTagTitle(template: EmailTemplate, tag: RepeatTreeBlockTag): string {
  const prototypeNames = tag.prototypeChildIds
    .map((id) => blockDisplayName(template, id))
    .join("、");
  const lines = [`数组：${tag.slotLabel}（${tag.slotId}）`, `行模板：${prototypeNames || "—"}`];
  if (tag.role === "host") {
    lines.unshift("列表重复宿主容器");
  } else if (tag.role === "prototype") {
    lines.unshift("列表重复 · 行模板（按此项复制）");
  } else if (tag.itemIndex !== undefined) {
    lines.unshift(`列表重复 · 第 ${tag.itemIndex + 1} 项`);
  } else {
    lines.unshift("列表重复 · 展开项");
  }
  return lines.join("\n");
}

/** 选中行时左侧色条（含行模板子树内区块） */
/** 虚拟 repeat-item 是否为该列表组的一行复制根（行模板 / self-repeat 宿主），非子树内普通块 */
export function isRepeatItemCloneRoot(
  ref: VirtualBlockRef,
  tagIndex: RepeatRegionTreeTagIndex
): boolean {
  if (ref.kind !== "repeat-item") return false;
  const host = tagIndex.hosts.find((h) => h.hostId === ref.hostId);
  if (!host) return false;
  return host.prototypeChildIds.includes(ref.prototypeRootId);
}

/**
 * 区块树行右侧 pill：宿主/行模板原样；repeat-item 仅在复制根展示（第 1 项标「列表」，其余标「重复」）。
 */
export function repeatTreeRowDisplayTag(
  ref: VirtualBlockRef,
  directTag: RepeatTreeBlockTag | null,
  tagIndex: RepeatRegionTreeTagIndex
): RepeatTreeBlockTag | null {
  if (!directTag) return null;
  if (directTag.role === "host" || directTag.role === "prototype") {
    return directTag;
  }
  if (directTag.role !== "repeat-item") return null;
  if (!isRepeatItemCloneRoot(ref, tagIndex)) return null;
  if (directTag.itemIndex === 0) {
    return { ...directTag, role: "host" };
  }
  return directTag;
}

export function repeatTreeTagForBlock(
  index: RepeatRegionTreeTagIndex,
  template: EmailTemplate,
  blockId: string
): RepeatTreeBlockTag | null {
  const direct = index.byBlockId.get(blockId);
  if (direct) return direct;

  let currentId: string | null = blockId;
  while (currentId) {
    const tag = index.byBlockId.get(currentId);
    if (tag?.role === "prototype" || tag?.role === "repeat-item") {
      return tag;
    }
    currentId = template.blocks[currentId]?.parentId ?? null;
  }

  return null;
}
