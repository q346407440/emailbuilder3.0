import type { CollectionItemFieldValueType, SlotValueType } from "./types";
import { STANDARD_SCALAR_VALUE_TYPES } from "./standard-scalar-types";

/** variable + allowExternal 绑定允许的 valueType */
export const SLOT_VALUE_TYPES: readonly SlotValueType[] = [
  "string",
  "url",
  "image",
  "color",
  "number",
  "boolean",
  "object",
  "collection",
] as const;

export const SLOT_VALUE_TYPE_SET = new Set<string>(SLOT_VALUE_TYPES);

/**
 * collection.itemFields[].valueType 枚举（标量与 `STANDARD_SCALAR_VALUE_TYPES` 一致 + collection）。
 * 展示名、归一化、嵌套深度规则见 **`collection-item-fields.ts`**（唯一真源，勿在别处重复）。
 */
export const COLLECTION_ITEM_FIELD_SCALAR_TYPES = STANDARD_SCALAR_VALUE_TYPES;

export const COLLECTION_ITEM_FIELD_TYPES: readonly CollectionItemFieldValueType[] = [
  ...STANDARD_SCALAR_VALUE_TYPES,
  "collection",
] as const;

/** 存量 JSON 可能仍为 image，校验接受；保存/UI 新建应使用 url */
export const LEGACY_COLLECTION_ITEM_FIELD_IMAGE = "image" as const;

export const COLLECTION_ITEM_FIELD_TYPE_SET = new Set<string>([
  ...COLLECTION_ITEM_FIELD_TYPES,
  LEGACY_COLLECTION_ITEM_FIELD_IMAGE,
]);

export function normalizeCollectionItemFieldValueType(
  raw: string
): CollectionItemFieldValueType | null {
  if (raw === LEGACY_COLLECTION_ITEM_FIELD_IMAGE) return "url";
  if ((COLLECTION_ITEM_FIELD_TYPES as readonly string[]).includes(raw)) {
    return raw as CollectionItemFieldValueType;
  }
  return null;
}

/** slotId 标识符：字母开头，后接字母数字下划线 */
export const SLOT_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function isSlotValueType(raw: unknown): raw is SlotValueType {
  return typeof raw === "string" && SLOT_VALUE_TYPE_SET.has(raw);
}

export function isCollectionItemFieldType(
  raw: unknown
): raw is CollectionItemFieldValueType | typeof LEGACY_COLLECTION_ITEM_FIELD_IMAGE {
  return typeof raw === "string" && COLLECTION_ITEM_FIELD_TYPE_SET.has(raw);
}
