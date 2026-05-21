import type { CollectionItemFieldValueType, SlotValueType } from "../payload-contract/types";

export type VisibilityCollectionItemField = {
  key: string;
  label: string;
  valueType: CollectionItemFieldValueType;
  required?: boolean;
  placeholder?: string;
};

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
  itemFields?: VisibilityCollectionItemField[];
  minItems?: number;
  maxItems?: number;
  label?: string;
  description?: string;
};
