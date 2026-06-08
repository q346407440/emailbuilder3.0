import type { EmailBlock } from "../types/email";
import type { NestedEmailBlock } from "./types";
import { NESTED_TEMPLATE_SCHEMA_VERSION } from "./types";

/** nested 落盘 block 母版 */
export type NestedBlockMaster = {
  schemaVersion: typeof NESTED_TEMPLATE_SCHEMA_VERSION;
  masterId: string;
  name: string;
  version: string;
  description?: string;
  runtimeType: EmailBlock["type"];
  blockType: string;
  sampleBlockId: string;
  catalogRootBlockId: string;
  root: NestedEmailBlock;
};

/** nested 落盘 section 母版 */
export type NestedSectionMaster = {
  schemaVersion: typeof NESTED_TEMPLATE_SCHEMA_VERSION;
  masterId: string;
  name: string;
  version: string;
  description?: string;
  rootBlockId: string;
  catalogRootBlockId: string;
  root: NestedEmailBlock;
  /** 逻辑删除时间（ISO）；存在则不在模块库列表展示 */
  deletedAt?: string;
};

export type NestedMaster = NestedBlockMaster | NestedSectionMaster;

export function isNestedSectionMaster(
  master: NestedMaster
): master is NestedSectionMaster {
  return "rootBlockId" in master && typeof master.rootBlockId === "string";
}
