import type { BlockInsertPrototype } from "../block-insert-default-contract";
import type { EmailBlock } from "../types/email";
import type { BlockMaster } from "../types/master";
import { masterToEmailTemplate, normalizeMasterBlocks } from "./masterCatalog";
import { normalizeTemplateBlockDefaults } from "./templateBlockDefaults";
import { collectMasterValidationIssues } from "./masterCatalog";
import type { ValidationIssue } from "./validate";

/** 将提取的原型写入母版 sample 块（清空 bindings / repeat / visibility / children）。 */
export function applyInsertPrototypeToBlockMaster(
  master: BlockMaster,
  prototype: BlockInsertPrototype
): BlockMaster {
  const next = structuredClone(master);
  const sample = next.blocks[next.sampleBlockId];
  if (!sample) {
    throw new Error(`母版缺少 sample 块：${next.sampleBlockId}`);
  }

  sample.props = structuredClone(prototype.props) as EmailBlock["props"];
  sample.wrapperStyle = structuredClone(prototype.wrapperStyle) as EmailBlock["wrapperStyle"];
  sample.children = [];
  sample.bindings = {};
  delete (sample as { repeat?: unknown }).repeat;
  delete (sample as { visibility?: unknown }).visibility;

  const graph = masterToEmailTemplate(next, { templateId: `master-${next.masterId}` });
  normalizeTemplateBlockDefaults(graph);
  next.blocks = graph.blocks;

  normalizeMasterBlocks(next);
  return next;
}

export function validateBlockMasterForPersist(master: BlockMaster): ValidationIssue[] {
  return collectMasterValidationIssues(master);
}

/** 从母版 sample 构建插入用 block（新 id / parentId，无子节点与 bindings）。 */
export function buildInsertBlockFromMasterSample(
  master: BlockMaster,
  blockId: string,
  parentId: string
): EmailBlock {
  const sample = master.blocks[master.sampleBlockId];
  if (!sample) {
    throw new Error(`母版缺少 sample 块：${master.sampleBlockId}`);
  }
  const cloned = structuredClone(sample) as EmailBlock;
  return {
    ...cloned,
    id: blockId,
    parentId,
    children: [],
    bindings: {},
  };
}
