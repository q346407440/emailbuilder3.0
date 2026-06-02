/**
 * collection 槽 `itemFields` / repeat.itemFields 契约唯一真源。
 *
 * - 可选 valueType、展示名、存量 image→url 归一：见本文件下半「类型」段；枚举常量仍在 **`value-types.ts`**（`COLLECTION_ITEM_FIELD_TYPES`）。
 * - 最多 2 级列表（嵌套深度）：见本文件「嵌套」段。
 * - UI/校验/落盘：只消费本模块与 `value-types.ts`，禁止在组件或技能中另维护类型表。
 */
import type { BindingCollectionField } from "../types/email";
import type { CollectionItemFieldValueType } from "./types";
import { isStandardScalarValueType, standardScalarValueTypeLabel } from "./standard-scalar-types";
import {
  COLLECTION_ITEM_FIELD_TYPES,
  LEGACY_COLLECTION_ITEM_FIELD_IMAGE,
  normalizeCollectionItemFieldValueType,
} from "./value-types";

// —— 嵌套（最多 2 级列表）——

/** 业务语义：列表变量最多 2 级（槽位列表 + itemFields 内一层子列表字段） */
export const COLLECTION_LIST_LEVEL_MAX = 2;

/**
 * itemFields 树中允许声明 valueType=collection 的最大深度（0 = 槽位/ repeat 直属 itemFields）。
 * 深度 1 起仅允许标量列，禁止再嵌套子列表。
 */
export const COLLECTION_ITEM_FIELD_MAX_COLLECTION_TYPE_DEPTH = 0;

export const COLLECTION_ITEM_FIELDS_NESTING_ERROR =
  "最多支持 2 级列表：子列表内不能再声明「子列表」类型字段";

export function canDeclareCollectionItemFieldType(collectionTypeDepth: number): boolean {
  return collectionTypeDepth <= COLLECTION_ITEM_FIELD_MAX_COLLECTION_TYPE_DEPTH;
}

/** itemPath 上穿越的 collection 字段层数（用于 repeat 嵌套列表深度） */
export function countCollectionFieldsInItemPath(
  itemFields: BindingCollectionField[] | undefined,
  itemPath: string
): number {
  if (!itemFields?.length || !itemPath.trim()) return 0;
  const parts = itemPath.split(".").filter(Boolean);
  let fields: BindingCollectionField[] | undefined = itemFields;
  let hops = 0;
  for (const part of parts) {
    const field = fields?.find((candidate) => candidate.key === part) as BindingCollectionField | undefined;
    if (!field) break;
    if (field.valueType === "collection") hops += 1;
    fields = field.valueType === "collection" ? field.itemFields : undefined;
  }
  return hops;
}

export function isItemPathWithinCollectionListLevelMax(
  itemFields: BindingCollectionField[] | undefined,
  itemPath: string
): boolean {
  return countCollectionFieldsInItemPath(itemFields, itemPath) <= 1;
}

/** 校验 itemFields 树是否违反「最多 2 级列表」 */
export function collectionItemFieldsNestingError(
  itemFields: BindingCollectionField[] | undefined,
  collectionTypeDepth = 0
): string | null {
  if (!itemFields?.length) return null;
  for (const field of itemFields) {
    if (field.valueType !== "collection") continue;
    if (!canDeclareCollectionItemFieldType(collectionTypeDepth)) {
      return COLLECTION_ITEM_FIELDS_NESTING_ERROR;
    }
    const nested = collectionItemFieldsNestingError(field.itemFields, collectionTypeDepth + 1);
    if (nested) return nested;
  }
  return null;
}

export function isCollectionField(
  field: BindingCollectionField | undefined
): field is Extract<BindingCollectionField, { valueType: "collection" }> {
  return field?.valueType === "collection";
}

export function scalarCollectionFields(
  itemFields: BindingCollectionField[] | undefined
): Array<Exclude<BindingCollectionField, { valueType: "collection" }>> {
  return (itemFields ?? []).filter(
    (field): field is Exclude<BindingCollectionField, { valueType: "collection" }> =>
      field.valueType !== "collection"
  );
}

export function emptyValueForCollectionField(field: BindingCollectionField): unknown {
  if (field.valueType === "collection") return [];
  return "";
}

export function findCollectionFieldByPath(
  itemFields: BindingCollectionField[] | undefined,
  fieldPath: string
): BindingCollectionField | undefined {
  if (!itemFields?.length || !fieldPath?.trim()) return undefined;
  const parts = fieldPath.split(".").filter(Boolean);
  let fields: BindingCollectionField[] | undefined = itemFields;
  let field: BindingCollectionField | undefined;
  for (const part of parts) {
    field = fields?.find((candidate) => candidate.key === part);
    if (!field) return undefined;
    fields = field.valueType === "collection" ? field.itemFields : undefined;
  }
  return field;
}

export function findCollectionFieldChildren(
  itemFields: BindingCollectionField[] | undefined,
  fieldPath: string
): BindingCollectionField[] | undefined {
  const field = findCollectionFieldByPath(itemFields, fieldPath);
  return field?.valueType === "collection" ? field.itemFields : undefined;
}

export function nestedCollectionFieldCandidates(
  itemFields: BindingCollectionField[] | undefined,
  prefix = ""
): Array<{
  path: string;
  field: Extract<BindingCollectionField, { valueType: "collection" }>;
}> {
  if (!itemFields?.length) return [];
  const out: Array<{
    path: string;
    field: Extract<BindingCollectionField, { valueType: "collection" }>;
  }> = [];
  itemFields.forEach((field) => {
    const path = prefix ? `${prefix}.${field.key}` : field.key;
    if (field.valueType !== "collection") return;
    out.push({ path, field });
  });
  return out;
}

// —— 类型（与标准标量一致 + 子列表）——

/** 列表行字段配置 UI / 新建可选类型（= STANDARD_SCALAR + collection） */
export function collectionItemFieldTypesForPicker(): readonly CollectionItemFieldValueType[] {
  return COLLECTION_ITEM_FIELD_TYPES;
}

/** 列表 itemFields 字段类型展示名（存量 image 展示为链接） */
export function collectionItemFieldValueTypeLabel(valueType: string): string {
  const normalized = normalizeCollectionItemFieldValueType(valueType);
  if (normalized && isStandardScalarValueType(normalized)) {
    return standardScalarValueTypeLabel(normalized);
  }
  if (valueType === LEGACY_COLLECTION_ITEM_FIELD_IMAGE) {
    return standardScalarValueTypeLabel("url");
  }
  if (normalized === "collection" || valueType === "collection") {
    return "列表";
  }
  return valueType;
}

/** 保存前将 itemFields 树中的废弃 image 归一为 url（写入 payload.slots / repeat） */
export function normalizeCollectionItemFields(
  itemFields: BindingCollectionField[]
): BindingCollectionField[] {
  return itemFields.map((field) => {
    if (field.valueType === "collection") {
      return {
        ...field,
        itemFields: normalizeCollectionItemFields(field.itemFields ?? []),
      };
    }
    const normalized = normalizeCollectionItemFieldValueType(field.valueType);
    if (!normalized || normalized === "collection") {
      return field;
    }
    return { ...field, valueType: normalized };
  });
}
