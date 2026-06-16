/**
 * object 槽 `objectFields` 契约唯一真源。
 * - 仅允许标量列（与 STANDARD_SCALAR 一致），禁止嵌套 collection。
 * - values[slotId] 为单个对象 `{ key: value }`，非数组。
 */
import type { BindingCollectionField } from "../types/email";
import { STANDARD_SCALAR_VALUE_TYPES } from "./standard-scalar-types";

export const OBJECT_FIELD_SCALAR_TYPES = STANDARD_SCALAR_VALUE_TYPES;

export const OBJECT_FIELD_SCALAR_TYPE_SET = new Set<string>(OBJECT_FIELD_SCALAR_TYPES);

export function isObjectFieldScalarType(raw: unknown): raw is (typeof OBJECT_FIELD_SCALAR_TYPES)[number] {
  return typeof raw === "string" && OBJECT_FIELD_SCALAR_TYPE_SET.has(raw);
}

export function scalarObjectFields(
  objectFields: BindingCollectionField[] | undefined
): Array<Exclude<BindingCollectionField, { valueType: "collection" }>> {
  return (objectFields ?? []).filter(
    (field): field is Exclude<BindingCollectionField, { valueType: "collection" }> =>
      field.valueType !== "collection"
  );
}

export function findObjectFieldByPath(
  objectFields: BindingCollectionField[] | undefined,
  fieldPath: string
): BindingCollectionField | undefined {
  if (!objectFields?.length || !fieldPath.trim()) return undefined;
  return objectFields.find((field) => field.key === fieldPath.trim());
}
