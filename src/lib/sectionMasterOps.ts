import { canSaveAsSection } from "../section-master-contract";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import type { SectionMaster } from "../types/master";
import type { TokenPresets } from "../types/tokenPreset";
import { CATALOG_ROOT_ID, buildCatalogEmailRoot } from "./blockDefaults";
import { materializeBlockForPersist } from "./blockPersistLiteralSnapshot";
import { collectSubtreeBlockIds } from "./deleteTemplateBlock";
import { collectMasterValidationIssues } from "./masterCatalog";
import { prepareCatalogBlockForInsert } from "./prepareCatalogBlockForInsert";
import { resolveInsertTarget, type InsertBlockMode } from "./templateBlockInsert";
import { uniqueTemplateBlockId } from "./templateBlockId";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function subtreeHasRepeat(template: EmailTemplate, rootBlockId: string): boolean {
  for (const id of collectSubtreeBlockIds(template, rootBlockId)) {
    if (template.blocks[id]?.repeat) return true;
  }
  return false;
}

/** 生成唯一 section masterId（`section.m` 前缀；与展示名称无关，名称可重复）。 */
export function deriveNewSectionMasterId(existingIds: Iterable<string>): string {
  const taken = new Set(existingIds);
  const stamp = () => Date.now().toString(36);
  let id = `section.m${stamp()}`;
  if (!taken.has(id)) return id;
  for (let i = 2; i < 10_000; i += 1) {
    id = `section.m${stamp()}${i.toString(36)}`;
    if (!taken.has(id)) return id;
  }
  return `section.m${stamp()}${Math.random().toString(36).slice(2, 10)}`;
}

/** 兼容旧调用：名称不参与 id，仅用于占用检测集合。 */
export function deriveSectionMasterIdFromName(
  _displayName: string,
  existingIds: Iterable<string>
): string {
  return deriveNewSectionMasterId(existingIds);
}

export function countSectionContentBlocks(section: SectionMaster): number {
  return collectSubtreeBlockIds(
    { blocks: section.blocks, rootBlockId: section.rootBlockId } as EmailTemplate,
    section.rootBlockId
  ).length;
}

export function extractSectionFromTemplate(args: {
  template: EmailTemplate;
  payload: EmailPayload;
  rootBlockId: string;
  masterId: string;
  name: string;
  description?: string;
  tokenPresets?: TokenPresets | null;
  /** 与画布一致的 merge 预览 flat 模板（正文变量烘焙）。 */
  previewFlatTemplate?: EmailTemplate | null;
  /** 按 blockId 取 merge 后块；缺省则仅读 template 字面量。 */
  getMergedBlock?: (blockId: string) => EmailBlock | null;
}): SectionMaster {
  const {
    template,
    payload,
    rootBlockId,
    masterId,
    name,
    description,
    tokenPresets,
    previewFlatTemplate,
    getMergedBlock,
  } = args;
  const root = template.blocks[rootBlockId];
  if (!root) {
    throw new Error("区块不存在，无法存为模块");
  }
  if (!canSaveAsSection(root)) {
    throw new Error("仅布局容器、栅格或图片（叠放外壳）可存为模块");
  }
  if (subtreeHasRepeat(template, rootBlockId)) {
    throw new Error("模块内不能包含列表循环（repeat），请先解除绑定后再保存");
  }

  const subtreeIds = collectSubtreeBlockIds(template, rootBlockId);
  const idMap = new Map<string, string>();
  for (let i = 0; i < subtreeIds.length; i += 1) {
    const oldId = subtreeIds[i]!;
    const suffix = i === 0 ? "root" : `n${i}`;
    idMap.set(oldId, `__sec_${suffix}__`);
  }
  const newRootId = idMap.get(rootBlockId)!;

  const blocks: EmailTemplate["blocks"] = {};
  const blockMeta: NonNullable<EmailTemplate["blockMeta"]> = {};

  for (const oldId of subtreeIds) {
    const old = template.blocks[oldId];
    if (!old) continue;
    const newId = idMap.get(oldId)!;
    const copied = materializeBlockForPersist({
      template,
      payload,
      blockId: oldId,
      mergedBlock: getMergedBlock?.(oldId) ?? null,
      previewFlatTemplate,
      tokenPresets,
    });
    copied.id = newId;
    copied.parentId =
      oldId === rootBlockId ? CATALOG_ROOT_ID : (idMap.get(old.parentId!) ?? copied.parentId);
    copied.children = (old.children ?? []).map((cid) => idMap.get(cid) ?? cid);
    blocks[newId] = copied;
    const meta = template.blockMeta?.[oldId];
    if (meta) {
      blockMeta[newId] = { ...meta };
    }
  }

  const catalogRoot = buildCatalogEmailRoot([newRootId]);
  blocks[CATALOG_ROOT_ID] = catalogRoot;
  blockMeta[CATALOG_ROOT_ID] = { blockType: "layout.container", name: "预览根" };

  const master: SectionMaster = {
    masterId,
    name: name.trim(),
    version: new Date().toISOString(),
    description: description?.trim() || undefined,
    rootBlockId: newRootId,
    catalogRootBlockId: CATALOG_ROOT_ID,
    blocks,
    blockMeta,
  };

  const issues = collectMasterValidationIssues(master);
  if (issues.length > 0) {
    const detail = issues
      .slice(0, 6)
      .map((i) => `${i.path} ${i.reason}`)
      .join("；");
    throw new Error(`模块校验未通过：${detail}`);
  }

  return master;
}

export function insertSectionIntoTemplate(args: {
  template: EmailTemplate;
  selectedBlockId: string | null;
  mode: InsertBlockMode;
  section: SectionMaster;
  tokenPresets?: TokenPresets | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const { template, selectedBlockId, mode, section, tokenPresets } = args;
  const { parentId, insertIndex } = resolveInsertTarget(template, selectedBlockId, mode);
  const subtreeIds = collectSubtreeBlockIds(
    { blocks: section.blocks, rootBlockId: section.rootBlockId } as EmailTemplate,
    section.rootBlockId
  );

  const next = clone(template);
  const idMap = new Map<string, string>();

  for (const oldId of subtreeIds) {
    const old = section.blocks[oldId];
    if (!old) continue;
    idMap.set(oldId, uniqueTemplateBlockId(next, old.type));
  }

  const newRootId = idMap.get(section.rootBlockId)!;

  for (const oldId of subtreeIds) {
    const old = section.blocks[oldId]!;
    const newId = idMap.get(oldId)!;
    let copied = clone(old) as EmailBlock;
    copied.id = newId;
    copied.parentId =
      oldId === section.rootBlockId
        ? parentId
        : (idMap.get(old.parentId!) ?? copied.parentId);
    copied.children = (old.children ?? []).map((cid) => idMap.get(cid) ?? cid);
    copied = prepareCatalogBlockForInsert(copied, tokenPresets);
    next.blocks[newId] = copied;
    const meta = section.blockMeta?.[oldId];
    if (meta) {
      next.blockMeta = next.blockMeta ?? {};
      next.blockMeta[newId] = { ...meta };
    }
  }

  const parent = next.blocks[parentId];
  if (!parent) throw new Error("目标父区块不存在");
  parent.children = [...(parent.children ?? [])];
  parent.children.splice(insertIndex, 0, newRootId);

  return { template: next, insertedBlockId: newRootId };
}

export function insertSectionAtParentIndex(args: {
  template: EmailTemplate;
  parentId: string;
  insertIndex: number;
  section: SectionMaster;
  tokenPresets?: TokenPresets | null;
}): { template: EmailTemplate; insertedBlockId: string } {
  const { template, parentId, insertIndex, section, tokenPresets } = args;
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
  const childCount = parent.children?.length ?? 0;
  if (insertIndex < 0 || insertIndex > childCount) {
    throw new Error("插入位置无效");
  }

  const subtreeIds = collectSubtreeBlockIds(
    { blocks: section.blocks, rootBlockId: section.rootBlockId } as EmailTemplate,
    section.rootBlockId
  );

  const next = clone(template);
  const idMap = new Map<string, string>();

  for (const oldId of subtreeIds) {
    const old = section.blocks[oldId];
    if (!old) continue;
    idMap.set(oldId, uniqueTemplateBlockId(next, old.type));
  }

  const newRootId = idMap.get(section.rootBlockId)!;

  for (const oldId of subtreeIds) {
    const old = section.blocks[oldId]!;
    const newId = idMap.get(oldId)!;
    let copied = clone(old) as EmailBlock;
    copied.id = newId;
    copied.parentId =
      oldId === section.rootBlockId
        ? parentId
        : (idMap.get(old.parentId!) ?? copied.parentId);
    copied.children = (old.children ?? []).map((cid) => idMap.get(cid) ?? cid);
    copied = prepareCatalogBlockForInsert(copied, tokenPresets);
    next.blocks[newId] = copied;
    const meta = section.blockMeta?.[oldId];
    if (meta) {
      next.blockMeta = next.blockMeta ?? {};
      next.blockMeta[newId] = { ...meta };
    }
  }

  const nextParent = next.blocks[parentId];
  if (!nextParent) throw new Error("目标父区块不存在");
  nextParent.children = [...(nextParent.children ?? [])];
  nextParent.children.splice(insertIndex, 0, newRootId);

  return { template: next, insertedBlockId: newRootId };
}
