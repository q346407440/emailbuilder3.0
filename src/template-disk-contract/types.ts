import type {
  BlockBindings,
  RepeatRegionBinding,
} from "../types/email";
import type { VisibilityRule } from "../visibility-contract/types";

/** 落盘 template / masters 节点唯一 schema 版本 */
export const NESTED_TEMPLATE_SCHEMA_VERSION = "4.0.0" as const;

export type NestedBlockMeta = {
  blockType: string;
  name: string;
};

/** nested 落盘节点（叶子可省略 children） */
export type NestedEmailBlock = {
  id: string;
  blockMeta: NestedBlockMeta;
  type: string;
  wrapperStyle?: Record<string, unknown>;
  props: Record<string, unknown>;
  bindings?: BlockBindings;
  repeat?: RepeatRegionBinding;
  visibility?: VisibilityRule;
  children?: NestedEmailBlock[];
};

/** emails layouts 下 template.json 落盘形态 */
export type NestedEmailTemplate = {
  schemaVersion: typeof NESTED_TEMPLATE_SCHEMA_VERSION;
  emailId?: string;
  templateId: string;
  templateVersion: number;
  locale?: string;
  meta?: Record<string, unknown>;
  root: NestedEmailBlock;
};

export type NestedDiskValidationIssue = {
  path: string;
  reason: string;
};
