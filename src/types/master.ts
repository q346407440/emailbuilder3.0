import type { EmailBlock, EmailTemplate } from "./email";
import type { ConfigSchema } from "./configSchema";

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
  configSchema: ConfigSchema;
};

/** Section 母版：完整模块子树 + 配置面契约。 */
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
  configSchema: ConfigSchema;
};

export type MasterKind = "blocks" | "sections";
