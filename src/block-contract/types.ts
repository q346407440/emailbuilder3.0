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

/** 全部合法运行时 type（派生自映射表键，供壳层校验与提示文案复用）。 */
export const RUNTIME_BLOCK_TYPES = Object.keys(RUNTIME_TYPE_TO_SEMANTIC) as Array<
  EmailBlock["type"]
>;

/**
 * 运行时 type 别名表：LLM/外部输入常见的等价写法 → 合法运行时 type。
 * 派生规则（不手维护第二份键表）：
 * - `<type>Block` 后缀（textBlock→text）；
 * - 语义类型当 runtime 用（content.text→text）；
 * - 驼峰语义名（layoutContainer→layout）。
 */
const RUNTIME_TYPE_ALIASES: Record<string, EmailBlock["type"]> = (() => {
  const aliases: Record<string, EmailBlock["type"]> = {};
  for (const [runtimeType, semantic] of Object.entries(RUNTIME_TYPE_TO_SEMANTIC) as Array<
    [EmailBlock["type"], SemanticBlockType]
  >) {
    aliases[`${runtimeType}Block`] = runtimeType;
    aliases[semantic] = runtimeType;
    // content.text → contentText 这类驼峰变体（layout.container→layoutContainer 等）
    const camel = semantic.replace(/\.([a-z])/g, (_, c: string) => c.toUpperCase());
    aliases[camel] = runtimeType;
  }
  return aliases;
})();

/** 非法运行时 type 的确定性归一：可归一返回合法 type，否则 null（交语义层处理）。 */
export function normalizeRuntimeTypeAlias(type: string): EmailBlock["type"] | null {
  if (type in RUNTIME_TYPE_TO_SEMANTIC) return type as EmailBlock["type"];
  return RUNTIME_TYPE_ALIASES[type] ?? null;
}

/**
 * 由运行时 type 推断 blockMeta.blockType（落盘语义）：
 * emailRoot 的 blockMeta 约定写 layout.container（registry 解析时始终视 email.root），
 * 其余按默认映射。未知 type 返回 null，不编造语义类型。
 */
export function inferSemanticBlockTypeForMeta(type: string): SemanticBlockType | null {
  const normalized = normalizeRuntimeTypeAlias(type);
  if (normalized === null) return null;
  if (normalized === "emailRoot") return "layout.container";
  return RUNTIME_TYPE_TO_SEMANTIC[normalized];
}

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
