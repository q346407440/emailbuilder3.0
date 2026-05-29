import type { EmailBlock, EmailTemplate } from "../types/email";
import type { SectionMaster } from "../types/master";
import { decorateThemeAndKindBindings } from "./decorateBindings";
import { CATALOG_ROOT_ID, buildCatalogEmailRoot } from "./blockDefaults";
import { normalizeTemplateBlockDefaults } from "./templateBlockDefaults";

export type SectionSourceSpec = {
  masterId: string;
  name: string;
  description?: string;
  /** 原模板中 section 壳 layout 的 block id */
  sourceRootBlockId: string;
};

/** 从完整邮件模板中抽取单个 section 子树，挂到预览用 emailRoot 下。 */
export function extractSectionMasterFromTemplate(
  template: EmailTemplate,
  spec: SectionSourceSpec
): SectionMaster {
  const sourceRoot = template.blocks[spec.sourceRootBlockId];
  if (!sourceRoot) {
    throw new Error(`section 根 block 不存在：${spec.sourceRootBlockId}`);
  }

  const blocks: EmailTemplate["blocks"] = {};
  const blockMeta: EmailTemplate["blockMeta"] = {};

  const walk = (id: string, parentId: string) => {
    const source = template.blocks[id];
    if (!source) return;
    const copy = structuredClone(source) as EmailBlock;
    copy.parentId = parentId;
    blocks[id] = copy;
    const meta = template.blockMeta?.[id];
    if (meta) blockMeta[id] = structuredClone(meta);
    for (const childId of source.children) walk(childId, id);
  };

  const sectionRoot = structuredClone(sourceRoot) as EmailBlock;
  sectionRoot.parentId = CATALOG_ROOT_ID;
  blocks[spec.sourceRootBlockId] = sectionRoot;
  const rootMeta = template.blockMeta?.[spec.sourceRootBlockId];
  if (rootMeta) blockMeta[spec.sourceRootBlockId] = structuredClone(rootMeta);

  for (const childId of sourceRoot.children) {
    walk(childId, spec.sourceRootBlockId);
  }

  const catalogRoot = buildCatalogEmailRoot([spec.sourceRootBlockId]);
  blocks[CATALOG_ROOT_ID] = catalogRoot;
  blockMeta[CATALOG_ROOT_ID] = { blockType: "layout.container", name: "预览根" };

  const miniTemplate: EmailTemplate = {
    schemaVersion: template.schemaVersion,
    templateId: `master-section-${spec.masterId}`,
    templateVersion: 1,
    rootBlockId: CATALOG_ROOT_ID,
    blocks,
    blockMeta,
  };

  normalizeTemplateBlockDefaults(miniTemplate);
  decorateThemeAndKindBindings(miniTemplate);

  return {
    masterId: spec.masterId,
    name: spec.name,
    version: "1.0.0",
    description: spec.description,
    rootBlockId: spec.sourceRootBlockId,
    catalogRootBlockId: CATALOG_ROOT_ID,
    blocks: miniTemplate.blocks,
    blockMeta: miniTemplate.blockMeta,
  };
}

export const OCA_SECTION_SOURCES: SectionSourceSpec[] = [
  {
    masterId: "section-header",
    name: "模块 · 顶栏文案",
    description: "顶栏 Logo 行、主标题与副标题。",
    sourceRootBlockId: "oca-mod-header",
  },
  {
    masterId: "section-hero",
    name: "模块 · 主推商品",
    description: "灰底主推区：主图、款名与 CTA 按钮。",
    sourceRootBlockId: "oca-mod-hero",
  },
  {
    masterId: "section-recent-viewed",
    name: "模块 · 最近浏览",
    description: "标题 + 商品栅格列表。",
    sourceRootBlockId: "oca-mod-recent",
  },
  {
    masterId: "section-category",
    name: "模块 · 分类宫格",
    description: "分类标题 + 四宫格入口。",
    sourceRootBlockId: "oca-mod-category",
  },
  {
    masterId: "section-footer",
    name: "模块 · 页脚",
    description: "包邮横幅、Logo、社媒图标、链接与版权信息。",
    sourceRootBlockId: "oca-mod-footer",
  },
];
