import type { BindingCollectionField } from "../types/email";
import type { EmailPayload, EmailTemplate } from "../types/email";

/** 列表变量 mock 中禁止持久化的替代文字列（商品图 / 专辑封面等） */
export const COLLECTION_FORBIDDEN_ALT_FIELD_KEYS = ["imageAlt", "coverAlt"] as const;

export type CollectionForbiddenAltFieldKey = (typeof COLLECTION_FORBIDDEN_ALT_FIELD_KEYS)[number];

/** @deprecated 使用 COLLECTION_FORBIDDEN_ALT_FIELD_KEYS */
export const COLLECTION_IMAGE_ALT_FIELD_KEY = "imageAlt";

function isForbiddenAltFieldKey(key: string): key is CollectionForbiddenAltFieldKey {
  return (COLLECTION_FORBIDDEN_ALT_FIELD_KEYS as readonly string[]).includes(key);
}

function isForbiddenAltSourcePath(sourcePath: string): boolean {
  const trimmed = sourcePath.trim();
  if (!trimmed) return false;
  for (const forbiddenKey of COLLECTION_FORBIDDEN_ALT_FIELD_KEYS) {
    if (trimmed === forbiddenKey || trimmed.endsWith(`.${forbiddenKey}`)) return true;
  }
  return false;
}

/** 从列表 itemFields 递归移除 imageAlt / coverAlt 列 */
export function stripForbiddenAltFieldsFromItemFields(
  itemFields: BindingCollectionField[] | undefined
): { fields: BindingCollectionField[]; changed: boolean } {
  if (!itemFields?.length) return { fields: itemFields ?? [], changed: false };
  let changed = false;
  const fields = itemFields
    .filter((field) => {
      if (isForbiddenAltFieldKey(field.key)) {
        changed = true;
        return false;
      }
      return true;
    })
    .map((field) => {
      if (field.valueType !== "collection" || !field.itemFields?.length) return field;
      const nested = stripForbiddenAltFieldsFromItemFields(field.itemFields);
      if (!nested.changed) return field;
      changed = true;
      return { ...field, itemFields: nested.fields };
    });
  return { fields, changed };
}

/** @deprecated 使用 stripForbiddenAltFieldsFromItemFields */
export const stripImageAltFromItemFields = stripForbiddenAltFieldsFromItemFields;

/** 按 itemFields 结构从单行 collection 值移除 imageAlt / coverAlt */
export function stripForbiddenAltFieldsFromCollectionRow(
  row: Record<string, unknown>,
  itemFields: BindingCollectionField[]
): { row: Record<string, unknown>; changed: boolean } {
  let changed = false;
  const next: Record<string, unknown> = { ...row };

  for (const field of itemFields) {
    if (isForbiddenAltFieldKey(field.key) && field.key in next) {
      delete next[field.key];
      changed = true;
    }
    if (field.valueType === "collection" && field.itemFields && Array.isArray(next[field.key])) {
      const nestedRows = next[field.key] as unknown[];
      const stripped = nestedRows.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return item;
        const result = stripForbiddenAltFieldsFromCollectionRow(
          item as Record<string, unknown>,
          field.itemFields!
        );
        if (result.changed) changed = true;
        return result.row;
      });
      next[field.key] = stripped;
    }
  }

  for (const forbiddenKey of COLLECTION_FORBIDDEN_ALT_FIELD_KEYS) {
    if (forbiddenKey in next) {
      delete next[forbiddenKey];
      changed = true;
    }
  }

  return { row: next, changed };
}

/** @deprecated 使用 stripForbiddenAltFieldsFromCollectionRow */
export const stripImageAltFromCollectionRow = stripForbiddenAltFieldsFromCollectionRow;

/** 递归删除任意 JSON 中的 imageAlt / coverAlt 键（迁移兜底） */
export function stripForbiddenAltFieldsDeep(value: unknown): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = stripForbiddenAltFieldsDeep(item);
      if (result.changed) changed = true;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const record = { ...(value as Record<string, unknown>) };
    for (const forbiddenKey of COLLECTION_FORBIDDEN_ALT_FIELD_KEYS) {
      if (forbiddenKey in record) {
        delete record[forbiddenKey];
        changed = true;
      }
    }
    for (const [key, nested] of Object.entries(record)) {
      const result = stripForbiddenAltFieldsDeep(nested);
      if (result.changed) {
        changed = true;
        record[key] = result.value;
      }
    }
    return { value: record, changed };
  }

  return { value, changed: false };
}

/** @deprecated 使用 stripForbiddenAltFieldsDeep */
export const stripImageAltDeep = stripForbiddenAltFieldsDeep;

/** 从 payload 槽目录与 collection 取值剥离 imageAlt / coverAlt */
export function stripForbiddenAltFieldsFromPayload(payload: EmailPayload): boolean {
  let changed = false;

  for (const slot of Object.values(payload.slots ?? {})) {
    if (slot.valueType !== "collection" || !slot.itemFields?.length) continue;
    const result = stripForbiddenAltFieldsFromItemFields(slot.itemFields);
    if (result.changed) {
      slot.itemFields = result.fields;
      changed = true;
    }
  }

  for (const [slotId, slot] of Object.entries(payload.slots ?? {})) {
    if (slot.valueType !== "collection") continue;
    const rawValues = payload.values?.[slotId];
    if (!Array.isArray(rawValues)) continue;
    const itemFields = slot.itemFields ?? [];
    const nextValues = rawValues.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      if (itemFields.length > 0) {
        const result = stripForbiddenAltFieldsFromCollectionRow(
          item as Record<string, unknown>,
          itemFields
        );
        if (result.changed) changed = true;
        return result.row;
      }
      const result = stripForbiddenAltFieldsDeep(item);
      if (result.changed) changed = true;
      return result.value;
    });
    if (payload.values) payload.values[slotId] = nextValues as typeof rawValues;
  }

  return changed;
}

/** @deprecated 使用 stripForbiddenAltFieldsFromPayload */
export const stripImageAltFromPayload = stripForbiddenAltFieldsFromPayload;

/** 从 template repeat 绑定剥离 imageAlt / coverAlt 列与字段映射 */
export function stripForbiddenAltFieldsFromTemplate(template: EmailTemplate): boolean {
  let changed = false;

  for (const block of Object.values(template.blocks)) {
    const repeat = block.repeat;
    if (repeat?.mode !== "collection") continue;

    const fieldsResult = stripForbiddenAltFieldsFromItemFields(repeat.itemFields);
    if (fieldsResult.changed) {
      repeat.itemFields = fieldsResult.fields;
      changed = true;
    }

    if (repeat.fieldMappings?.length) {
      const filtered = repeat.fieldMappings.filter((mapping) => {
        const sourcePath = mapping.sourcePath?.trim() ?? "";
        if (!sourcePath || !isForbiddenAltSourcePath(sourcePath)) return true;
        changed = true;
        return false;
      });
      if (filtered.length !== repeat.fieldMappings.length) {
        repeat.fieldMappings = filtered;
      }
    }
  }

  return changed;
}

/** @deprecated 使用 stripForbiddenAltFieldsFromTemplate */
export const stripImageAltFromTemplate = stripForbiddenAltFieldsFromTemplate;
