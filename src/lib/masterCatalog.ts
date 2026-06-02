import type { EmailTemplate } from "../types/email";
import type { BlockMaster, SectionMaster } from "../types/master";
import { decorateThemeAndKindBindings } from "./decorateBindings";
import { normalizeTemplateBlockDefaults } from "./templateBlockDefaults";
import { validateTemplate, type ValidationIssue } from "./validate";
import { BLOCK_CATALOG_ENTRIES, buildBlockMasterTemplate, CATALOG_ROOT_ID } from "./blockDefaults";

/** 母版 blocks 与业务 template 共用：回落无效 contentAlign、补齐默认值。 */
export function normalizeMasterBlocks(master: BlockMaster | SectionMaster): boolean {
  const template = masterToEmailTemplate(master, { templateId: `master-${master.masterId}` });
  const before = JSON.stringify(master.blocks);
  normalizeTemplateBlockDefaults(template);
  master.blocks = template.blocks;
  return JSON.stringify(master.blocks) !== before;
}

export function buildBlockMasters(): BlockMaster[] {
  return BLOCK_CATALOG_ENTRIES.map((entry) => {
    const partial = buildBlockMasterTemplate(entry);
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: `master-block-${entry.masterId}`,
      templateVersion: 1,
      ...partial,
    };
    normalizeTemplateBlockDefaults(template);
    decorateThemeAndKindBindings(template);
    const sampleBlockId = Object.keys(template.blocks).find((id) => id !== CATALOG_ROOT_ID)!;
    return {
      masterId: entry.masterId,
      name: entry.name,
      version: "1.0.0",
      description: entry.description,
      runtimeType: entry.runtimeType,
      blockType: entry.blockType,
      sampleBlockId,
      catalogRootBlockId: CATALOG_ROOT_ID,
      blocks: template.blocks,
      blockMeta: template.blockMeta,
    };
  });
}

export function masterToEmailTemplate(
  master: BlockMaster | SectionMaster,
  meta: { templateId: string }
): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: meta.templateId,
    templateVersion: 1,
    rootBlockId: master.catalogRootBlockId,
    blocks: master.blocks,
    blockMeta: master.blockMeta,
  };
}

export function collectMasterValidationIssues(
  master: BlockMaster | SectionMaster
): ValidationIssue[] {
  const template = masterToEmailTemplate(master, { templateId: `master-${master.masterId}` });
  normalizeTemplateBlockDefaults(template);
  decorateThemeAndKindBindings(template);
  return [...validateTemplate(template)];
}
