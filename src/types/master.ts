import type { EmailBlock, EmailTemplate } from "./email";

/** 基础 block 母版：单个运行时 block 类型及其默认子树。 */
export type BlockMaster = {
  masterId: string;
  name: string;
  version: string;
  description?: string;
  runtimeType: EmailBlock["type"];
  blockType: string;
  /** 母版内可插入 block 的 id */
  sampleBlockId: string;
  /** 预览用 emailRoot id */
  catalogRootBlockId: string;
  blocks: EmailTemplate["blocks"];
  blockMeta: EmailTemplate["blockMeta"];
};

/** Section 母版：完整模块子树。 */
export type SectionMaster = {
  masterId: string;
  name: string;
  version: string;
  description?: string;
  /** section 壳 layout 的 block id */
  rootBlockId: string;
  /** 预览用 emailRoot id */
  catalogRootBlockId: string;
  blocks: EmailTemplate["blocks"];
  blockMeta: EmailTemplate["blockMeta"];
  /** 逻辑删除时间（ISO）；模块库列表不展示，落盘文件保留 */
  deletedAt?: string;
};

export type MasterKind = "blocks" | "sections";
