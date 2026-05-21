import type { SlotValueType } from "../payload-contract/types";
import type { VisibilityOperator } from "./types";

export type VisibilityOperatorSpec = {
  operator: VisibilityOperator;
  label: string;
  requiresCompareValue: boolean;
  compareValueType?: "string" | "number" | "boolean";
};

const stringOperators: readonly VisibilityOperatorSpec[] = [
  { operator: "isEmpty", label: "为空", requiresCompareValue: false },
  { operator: "isNotEmpty", label: "不为空", requiresCompareValue: false },
  { operator: "equals", label: "等于", requiresCompareValue: true, compareValueType: "string" },
  { operator: "notEquals", label: "不等于", requiresCompareValue: true, compareValueType: "string" },
];

const numberOperators: readonly VisibilityOperatorSpec[] = [
  { operator: "equals", label: "等于", requiresCompareValue: true, compareValueType: "number" },
  { operator: "notEquals", label: "不等于", requiresCompareValue: true, compareValueType: "number" },
  { operator: "greaterThan", label: "大于", requiresCompareValue: true, compareValueType: "number" },
  { operator: "greaterThanOrEqual", label: "大于等于", requiresCompareValue: true, compareValueType: "number" },
  { operator: "lessThan", label: "小于", requiresCompareValue: true, compareValueType: "number" },
  { operator: "lessThanOrEqual", label: "小于等于", requiresCompareValue: true, compareValueType: "number" },
];

const booleanOperators: readonly VisibilityOperatorSpec[] = [
  { operator: "isTrue", label: "为真", requiresCompareValue: false },
  { operator: "isFalse", label: "为假", requiresCompareValue: false },
  { operator: "equals", label: "等于", requiresCompareValue: true, compareValueType: "boolean" },
  { operator: "notEquals", label: "不等于", requiresCompareValue: true, compareValueType: "boolean" },
];

const collectionOperators: readonly VisibilityOperatorSpec[] = [
  { operator: "isEmpty", label: "数组为空", requiresCompareValue: false },
  { operator: "isNotEmpty", label: "数组不为空", requiresCompareValue: false },
  { operator: "lengthEquals", label: "长度等于", requiresCompareValue: true, compareValueType: "number" },
  { operator: "lengthGreaterThan", label: "长度大于", requiresCompareValue: true, compareValueType: "number" },
  {
    operator: "lengthGreaterThanOrEqual",
    label: "长度大于等于",
    requiresCompareValue: true,
    compareValueType: "number",
  },
  { operator: "lengthLessThan", label: "长度小于", requiresCompareValue: true, compareValueType: "number" },
  {
    operator: "lengthLessThanOrEqual",
    label: "长度小于等于",
    requiresCompareValue: true,
    compareValueType: "number",
  },
];

export const VISIBILITY_OPERATORS_BY_VALUE_TYPE: Readonly<
  Record<SlotValueType, readonly VisibilityOperatorSpec[]>
> = {
  string: stringOperators,
  url: stringOperators,
  image: stringOperators,
  color: stringOperators,
  number: numberOperators,
  boolean: booleanOperators,
  collection: collectionOperators,
};

export function getVisibilityOperatorsForValueType(
  valueType: SlotValueType
): readonly VisibilityOperatorSpec[] {
  return VISIBILITY_OPERATORS_BY_VALUE_TYPE[valueType] ?? [];
}

export function getVisibilityOperatorSpec(
  valueType: SlotValueType,
  operator: VisibilityOperator
): VisibilityOperatorSpec | null {
  return (
    VISIBILITY_OPERATORS_BY_VALUE_TYPE[valueType].find((spec) => spec.operator === operator) ?? null
  );
}
