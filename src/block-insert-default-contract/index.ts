import type { FieldKind } from "../types/email";

/** 插入默认配置纳入的字段分类（对应 Inspector 内容 / 样式 / 布局三 Tab）。 */
export const INSERT_DEFAULT_FIELD_KINDS: readonly FieldKind[] = [
  "content",
  "style",
  "structural",
] as const;

export function isInsertDefaultFieldKind(kind: FieldKind): boolean {
  return (INSERT_DEFAULT_FIELD_KINDS as readonly string[]).includes(kind);
}

/** 从当前区块提取、写入母版 sample 的 props / wrapperStyle 快照（无 bindings / children）。 */
export type BlockInsertPrototype = {
  props: Record<string, unknown>;
  wrapperStyle: Record<string, unknown>;
};
