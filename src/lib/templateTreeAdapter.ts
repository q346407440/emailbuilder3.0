import {
  assertNestedDiskTemplate,
  assertNestedMasterDisk,
  NESTED_TEMPLATE_SCHEMA_VERSION,
  validateNestedDisk,
  validateNestedMasterDisk,
  type NestedBlockMaster,
  type NestedEmailBlock,
  type NestedEmailTemplate,
  type NestedMaster,
  type NestedSectionMaster,
  isNestedSectionMaster,
} from "../template-disk-contract";
import { inferSemanticBlockTypeForMeta } from "../block-contract/types";
import type { EmailBlock, EmailTemplate } from "../types/email";
import type { BlockMaster, SectionMaster } from "../types/master";
import type { ValidationIssue } from "./validate";
import { validateTemplate } from "./validate";
import { normalizeTemplateBlockDefaults } from "./templateBlockDefaults";
import { reconcileBlockParentIdsFromChildren } from "./repeatRegion";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function inferBlockMetaFromBlock(block: EmailBlock): { blockType: string; name: string } {
  // 映射真源在 block-contract（emailRoot 落盘约定 layout.container）；未知 type 原样保留交校验层报错
  return {
    blockType: inferSemanticBlockTypeForMeta(block.type) ?? block.type,
    name: block.id,
  };
}

function graphBlockToNestedNode(
  blockId: string,
  template: EmailTemplate
): NestedEmailBlock {
  const block = template.blocks[blockId];
  if (!block) throw new Error(`block 不存在：${blockId}`);

  const meta = template.blockMeta?.[blockId] ?? inferBlockMetaFromBlock(block);
  const blockType = meta.blockType?.trim() || inferBlockMetaFromBlock(block).blockType;
  const name = meta.name?.trim() || blockId;

  const nested: NestedEmailBlock = {
    id: block.id,
    type: block.type,
    blockMeta: { blockType, name },
    props: clone(block.props ?? {}),
  };

  if (block.wrapperStyle) nested.wrapperStyle = clone(block.wrapperStyle);
  if (block.bindings && Object.keys(block.bindings).length > 0) {
    nested.bindings = clone(block.bindings);
  }
  if (block.repeat) nested.repeat = clone(block.repeat);
  if (block.objectBind) nested.objectBind = clone(block.objectBind);
  if (block.visibility) nested.visibility = clone(block.visibility);

  const childIds = block.children ?? [];
  if (childIds.length > 0) {
    nested.children = childIds.map((childId) => graphBlockToNestedNode(childId, template));
  }

  return nested;
}

function nestedNodeToGraphBlock(
  node: NestedEmailBlock,
  parentId: string | null,
  acc: {
    blocks: Record<string, EmailBlock>;
    blockMeta: NonNullable<EmailTemplate["blockMeta"]>;
  }
): string {
  const childIds: string[] = [];
  for (const child of node.children ?? []) {
    childIds.push(nestedNodeToGraphBlock(child, node.id, acc));
  }

  const block = {
    id: node.id,
    type: node.type,
    parentId,
    children: childIds,
    props: clone(node.props ?? {}),
    ...(node.wrapperStyle ? { wrapperStyle: clone(node.wrapperStyle) } : {}),
    ...(node.bindings ? { bindings: clone(node.bindings) } : {}),
    ...(node.repeat ? { repeat: clone(node.repeat) } : {}),
    ...(node.objectBind ? { objectBind: clone(node.objectBind) } : {}),
    ...(node.visibility ? { visibility: clone(node.visibility) } : {}),
  } as EmailBlock;

  acc.blocks[node.id] = block;
  // blockMeta 缺失/不完整时推断兜底（与 graph→nested 方向对称）：
  // 壳层校验仍会报必填错误，但深层校验得以继续运行而非构图中断
  acc.blockMeta[node.id] = node.blockMeta
    ? {
        blockType: node.blockMeta.blockType ?? inferBlockMetaFromBlock(block).blockType,
        name: node.blockMeta.name ?? block.id,
      }
    : inferBlockMetaFromBlock(block);

  return node.id;
}

/** EditorBlockGraph → nested 4.0.0 落盘 envelope */
function editorGraphToNestedDisk(graph: EmailTemplate): NestedEmailTemplate {
  normalizeTemplateBlockDefaults(graph);
  reconcileBlockParentIdsFromChildren(graph, [graph.rootBlockId]);
  const root = graphBlockToNestedNode(graph.rootBlockId, graph);
  return {
    schemaVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
    emailId: graph.emailId,
    templateId: graph.templateId,
    templateVersion: graph.templateVersion,
    locale: graph.locale,
    meta: graph.meta ? clone(graph.meta) : undefined,
    root,
  };
}

/** nested 4.0.0 → EditorBlockGraph（内存投影） */
export function nestedToEditorGraph(nested: NestedEmailTemplate): EmailTemplate {
  const acc = {
    blocks: {} as Record<string, EmailBlock>,
    blockMeta: {} as NonNullable<EmailTemplate["blockMeta"]>,
  };
  nestedNodeToGraphBlock(nested.root, null, acc);
  reconcileBlockParentIdsFromChildren(
    { blocks: acc.blocks, rootBlockId: nested.root.id } as EmailTemplate,
    [nested.root.id]
  );

  const graph: EmailTemplate = {
    schemaVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
    emailId: nested.emailId,
    templateId: nested.templateId,
    templateVersion: nested.templateVersion,
    locale: nested.locale,
    meta: nested.meta ? clone(nested.meta) : undefined,
    rootBlockId: nested.root.id,
    blockMeta: acc.blockMeta,
    blocks: acc.blocks,
  };

  normalizeTemplateBlockDefaults(graph);
  return graph;
}

/** EditorBlockGraph → nested 4.0.0 落盘 */
export function editorGraphToNested(graph: EmailTemplate): NestedEmailTemplate {
  return editorGraphToNestedDisk(graph);
}

/** 读盘：只接受 nested 4.0.0 */
export function parseTemplateFromDisk(raw: unknown): EmailTemplate {
  const nested = assertNestedDiskTemplate(raw);
  return nestedToEditorGraph(nested);
}

/** 写盘：graph → nested 4.0.0 */
export function serializeTemplateToDisk(graph: EmailTemplate): NestedEmailTemplate {
  return editorGraphToNested(graph);
}

export function parseNestedTemplateFromDisk(raw: unknown): NestedEmailTemplate {
  return assertNestedDiskTemplate(raw);
}

/** nested 母版 → EditorBlockGraph（masterCatalog 等内存使用） */
export function nestedMasterToEditorGraph(master: NestedMaster): EmailTemplate {
  const acc = {
    blocks: {} as Record<string, EmailBlock>,
    blockMeta: {} as NonNullable<EmailTemplate["blockMeta"]>,
  };
  nestedNodeToGraphBlock(master.root, null, acc);
  reconcileBlockParentIdsFromChildren(
    { blocks: acc.blocks, rootBlockId: master.root.id } as EmailTemplate,
    [master.root.id]
  );

  const graph: EmailTemplate = {
    schemaVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
    templateId: master.masterId,
    templateVersion: 1,
    rootBlockId: master.root.id,
    blockMeta: acc.blockMeta,
    blocks: acc.blocks,
  };
  normalizeTemplateBlockDefaults(graph);
  return graph;
}

/** 读盘：只接受 nested 4.0.0 母版 wire */
export function parseMasterFromDisk(raw: unknown): NestedMaster {
  return assertNestedMasterDisk(raw);
}

export function validateMasterFromDisk(raw: unknown): ValidationIssue[] {
  const diskIssues = validateNestedMasterDisk(raw);
  if (diskIssues.length > 0) {
    return diskIssues.map((issue) => ({
      path: issue.path,
      reason: issue.reason,
      level: "error" as const,
    }));
  }
  const graph = nestedMasterToEditorGraph(raw as NestedMaster);
  return validateTemplate(graph);
}

export function serializeMasterToDisk(master: NestedMaster): NestedMaster {
  return clone(master);
}

export function validateTemplateFromDisk(raw: unknown): ValidationIssue[] {
  const diskIssues: ValidationIssue[] = validateNestedDisk(raw).map((issue) => ({
    path: issue.path,
    reason: issue.reason,
    level: "error" as const,
  }));
  // 壳层有错也尽量跑深层校验，一次性报全两层问题（错误分批暴露会拖长修复迭代，
  // 且壳层短路会掩盖深层契约违规）。
  let deepIssues: ValidationIssue[] = [];
  try {
    deepIssues = validateTemplate(nestedToEditorGraph(raw as NestedEmailTemplate));
  } catch (error) {
    // 壳层干净时构图失败是真异常须上抛；壳层已有错则视为结构性破损，壳层错误已覆盖根因
    if (diskIssues.length === 0) throw error;
  }
  const seen = new Set(diskIssues.map((i) => `${i.path}: ${i.reason}`));
  return [...diskIssues, ...deepIssues.filter((i) => !seen.has(`${i.path}: ${i.reason}`))];
}

export function readTemplateGraphFromDiskRaw(raw: unknown): EmailTemplate {
  return parseTemplateFromDisk(raw);
}

/** 编辑器内存母版 → nested 4.0.0 落盘 wire */
export function serializeEditorMasterToDisk(
  master: BlockMaster | SectionMaster
): NestedBlockMaster | NestedSectionMaster {
  const graph: EmailTemplate = {
    schemaVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
    templateId: master.masterId,
    templateVersion: 1,
    rootBlockId: master.catalogRootBlockId,
    blockMeta: clone(master.blockMeta ?? {}),
    blocks: clone(master.blocks),
  };
  normalizeTemplateBlockDefaults(graph);
  reconcileBlockParentIdsFromChildren(graph, [graph.rootBlockId]);
  const root = graphBlockToNestedNode(master.catalogRootBlockId, graph);

  if ("rootBlockId" in master && typeof master.rootBlockId === "string") {
    const section = master as SectionMaster;
    return {
      schemaVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
      masterId: section.masterId,
      name: section.name,
      version: section.version,
      description: section.description,
      rootBlockId: section.rootBlockId,
      catalogRootBlockId: section.catalogRootBlockId,
      root,
      ...(section.deletedAt ? { deletedAt: section.deletedAt } : {}),
    };
  }

  const block = master as BlockMaster;
  return {
    schemaVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
    masterId: block.masterId,
    name: block.name,
    version: block.version,
    description: block.description,
    runtimeType: block.runtimeType,
    blockType: block.blockType,
    sampleBlockId: block.sampleBlockId,
    catalogRootBlockId: block.catalogRootBlockId,
    root,
  };
}

/** nested 母版 wire → 编辑器内存 BlockMaster / SectionMaster */
export function nestedMasterToEditorMaster(
  master: NestedMaster
): BlockMaster | SectionMaster {
  const graph = nestedMasterToEditorGraph(master);
  if (isNestedSectionMaster(master)) {
    return {
      masterId: master.masterId,
      name: master.name,
      version: master.version,
      description: master.description,
      rootBlockId: master.rootBlockId,
      catalogRootBlockId: master.catalogRootBlockId,
      blocks: graph.blocks,
      blockMeta: graph.blockMeta,
      ...(master.deletedAt ? { deletedAt: master.deletedAt } : {}),
    };
  }
  const blockMaster = master as NestedBlockMaster;
  return {
    masterId: blockMaster.masterId,
    name: blockMaster.name,
    version: blockMaster.version,
    description: blockMaster.description,
    runtimeType: blockMaster.runtimeType,
    blockType: blockMaster.blockType,
    sampleBlockId: blockMaster.sampleBlockId,
    catalogRootBlockId: blockMaster.catalogRootBlockId,
    blocks: graph.blocks,
    blockMeta: graph.blockMeta,
  };
}

export { isNestedSectionMaster };
