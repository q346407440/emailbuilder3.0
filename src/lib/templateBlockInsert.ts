import type { EmailBlock, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import type { BlockMaster } from "../types/master";
import { BLOCK_CATALOG_ENTRIES, type BlockCatalogEntry } from "./blockDefaults";
import { buildCatalogSampleBlock } from "./buildCatalogSampleBlock";
import { prepareCatalogBlockForInsert } from "./prepareCatalogBlockForInsert";
import { uniqueTemplateBlockId } from "./templateBlockId";

export type InsertBlockMode = "child" | "below";

type InsertTarget = {
  parentId: string;
  insertIndex: number;
};

export function resolveInsertTarget(
  template: EmailTemplate,
  selectedBlockId: string | null,
  mode: InsertBlockMode
): InsertTarget {
  if (mode === "child") {
    const parentId = selectedBlockId ?? template.rootBlockId;
    const parent = template.blocks[parentId];
    if (!parent) throw new Error("目标父区块不存在");
    if (
      parent.type !== "emailRoot" &&
      parent.type !== "layout" &&
      parent.type !== "grid" &&
      parent.type !== "image"
    ) {
      throw new Error("当前区块不支持插入子级");
    }
    return { parentId, insertIndex: parent.children.length };
  }

  if (!selectedBlockId) {
    throw new Error("邮件根节点不支持下方插入");
  }
  const current = template.blocks[selectedBlockId];
  if (!current) throw new Error("当前区块不存在");
  if (!current.parentId) throw new Error("当前区块没有父级，无法下方插入");
  const parent = template.blocks[current.parentId];
  if (!parent) throw new Error("父级区块不存在");
  const at = parent.children.indexOf(current.id);
  if (at < 0) throw new Error("父级 children 中找不到当前区块");
  return { parentId: parent.id, insertIndex: at + 1 };
}

export function listInsertableCatalogEntries(): BlockCatalogEntry[] {
  return [...BLOCK_CATALOG_ENTRIES];
}

export function insertCatalogBlockIntoTemplate(args: {
  template: EmailTemplate;
  selectedBlockId: string | null;
  mode: InsertBlockMode;
  entry: BlockCatalogEntry;
  /** 用于将样例 $themeRef 物化为当前邮件样式档位的字面量；不传则用插入兜底值。 */
  tokenPresets?: TokenPresets | null;
  /** 运营保存的 block 母版（masterId → BlockMaster）；缺省则仅使用代码出厂默认。 */
  blockMastersById?: Readonly<Record<string, BlockMaster>> | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const { template, selectedBlockId, mode, entry, tokenPresets, blockMastersById } = args;
  const { parentId, insertIndex } = resolveInsertTarget(template, selectedBlockId, mode);
  const next = structuredClone(template) as EmailTemplate;
  const newId = uniqueTemplateBlockId(next, entry.runtimeType);
  const rawBlock = buildCatalogSampleBlock(entry, newId, parentId, blockMastersById);
  const newBlock = prepareCatalogBlockForInsert(
    {
      ...structuredClone(rawBlock),
      id: newId,
      parentId,
    } as EmailBlock,
    tokenPresets
  );

  next.blocks[newId] = newBlock;
  const parent = next.blocks[parentId];
  parent.children.splice(insertIndex, 0, newId);
  next.blockMeta = {
    ...(next.blockMeta ?? {}),
    [newId]: {
      blockType: entry.blockType,
      name: entry.name,
    },
  };
  return { template: next, insertedBlockId: newId };
}

