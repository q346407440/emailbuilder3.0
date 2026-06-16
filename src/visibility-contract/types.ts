import type { SlotValueType } from "../payload-contract/types";
import type { BindingCollectionField } from "../types/email";

/**
 * 显隐规则里描述列表/对象字段的类型。
 * 派生自 payload 契约的 {@link BindingCollectionField}（字段形态的唯一真源），
 * 避免与 payload 侧双写漂移。
 */
export type VisibilityCollectionItemField = BindingCollectionField;

export type VisibilityOperator =
  | "isEmpty"
  | "isNotEmpty"
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "isTrue"
  | "isFalse"
  | "lengthEquals"
  | "lengthGreaterThan"
  | "lengthGreaterThanOrEqual"
  | "lengthLessThan"
  | "lengthLessThanOrEqual";

export type VisibilityRule = {
  slotId: string;
  valueType: SlotValueType;
  operator: VisibilityOperator;
  compareValue?: string | number | boolean;
  /** 对象变量槽下的标量字段 key（valueType 为该字段类型，非 object） */
  objectFieldKey?: string;
  objectFields?: VisibilityCollectionItemField[];
  itemFields?: VisibilityCollectionItemField[];
  minItems?: number;
  maxItems?: number;
  label?: string;
  description?: string;
};
