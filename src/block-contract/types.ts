import type { EmailBlock } from "../types/email";
import type { FieldKind } from "../types/email";

/** 与组件库 `blockMeta.blockType` / `data/masters/blocks` 对齐的语义类型 */
export type SemanticBlockType =
  | "email.root"
  | "layout.container"
  | "layout.grid"
  | "content.text"
  | "content.image"
  | "content.icon"
  | "action.button"
  | "separator.divider"
  | "indicator.progress";

/** 运行时 `blocks[].type` → 默认语义类型（`blockMeta` 缺失时回退） */
export const RUNTIME_TYPE_TO_SEMANTIC: Record<EmailBlock["type"], SemanticBlockType> = {
  emailRoot: "email.root",
  layout: "layout.container",
  grid: "layout.grid",
  text: "content.text",
  image: "content.image",
  icon: "content.icon",
  button: "action.button",
  divider: "separator.divider",
  progress: "indicator.progress",
};

/**
 * 单 blockType 字段白名单契约。
 * `allowedPrefixes` 使用点路径前缀：允许该路径及其任意子路径（如 `wrapperStyle.padding` 含 `padding.top`）。
 */
export type BlockTypeContract = {
  blockType: SemanticBlockType;
  /** 运行时 type，与 `EmailBlock.type` 一致 */
  runtimeType: EmailBlock["type"];
  label: string;
  description?: string;
  /** block 壳层允许的一级键 */
  shellKeys: readonly string[];
  /** wrapperStyle / props 下允许的路径前缀（不含 `wrapperStyle` / `props` 根本身） */
  allowedPrefixes: readonly string[];
  /**
   * 绑定路径分类（与 `blockFieldClassification` 对齐，供文档与后续 lint 复用）。
   * 键为 bindPath（如 `props.fontSize`），未列出时仍可由分类器推断。
   */
  bindingKinds?: Partial<Record<string, FieldKind>>;
};
