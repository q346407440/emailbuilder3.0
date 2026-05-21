import type { BindingCollectionField, EmailPayload } from "../types/email";
import { collectionItemFieldsNestingError } from "../payload-contract/collection-item-fields";
import { padOrTrimCollectionValues, resolveCollectionFixedLength } from "./collectionDataSource";

const FIELD_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function validateCollectionItemFieldsLevel(
  itemFields: BindingCollectionField[],
  scopeLabel: string
): string | null {
  if (itemFields.length === 0) {
    return scopeLabel ? `${scopeLabel}须至少包含一个字段。` : "请至少声明一个行字段。";
  }
  const keys = new Set<string>();
  for (const field of itemFields) {
    const key = field.key.trim();
    if (!key) {
      return scopeLabel ? `${scopeLabel}存在未填写标识的字段。` : "行字段标识不能为空。";
    }
    if (!FIELD_KEY_PATTERN.test(key)) {
      return scopeLabel
        ? `${scopeLabel}字段标识「${key}」须以字母开头，且只能包含字母、数字和下划线。`
        : `字段标识「${key}」须以字母开头，且只能包含字母、数字和下划线。`;
    }
    if (keys.has(key)) {
      return scopeLabel ? `${scopeLabel}字段标识「${key}」重复。` : `字段标识「${key}」重复。`;
    }
    keys.add(key);
    if (!field.label.trim()) {
      return scopeLabel ? `${scopeLabel}请填写字段「${key}」的展示名称。` : `请填写字段「${key}」的展示名称。`;
    }
    if (field.valueType === "collection") {
      const nestedScope = scopeLabel ? `${scopeLabel} → ${field.label.trim() || key}` : `子列表「${key}」`;
      const nestedErr = validateCollectionItemFieldsLevel(field.itemFields ?? [], nestedScope);
      if (nestedErr) return nestedErr;
    }
  }
  return null;
}

export function validateCollectionItemFields(
  itemFields: BindingCollectionField[]
): string | null {
  const nestingErr = collectionItemFieldsNestingError(itemFields, 0);
  if (nestingErr) return nestingErr;
  return validateCollectionItemFieldsLevel(itemFields, "");
}

/** 更新 payload.slots 中的 itemFields，并按新字段键重整 values 数组 */
export function updatePayloadCollectionItemFields(
  payload: EmailPayload,
  slotId: string,
  itemFields: BindingCollectionField[]
): EmailPayload {
  const entry = payload.slots[slotId];
  if (!entry || entry.valueType !== "collection") return payload;

  const next: EmailPayload = {
    ...payload,
    slots: { ...payload.slots },
    values: { ...payload.values },
  };

  next.slots[slotId] = { ...entry, itemFields };

  const fixedLength = resolveCollectionFixedLength(entry.minItems, entry.maxItems);
  const raw = Array.isArray(next.values[slotId]) ? (next.values[slotId] as Record<string, unknown>[]) : [];
  const remapped = raw.map((row) => {
    const out: Record<string, unknown> = {};
    for (const field of itemFields) {
      const prev = row?.[field.key];
      out[field.key] = prev === undefined || prev === null ? "" : String(prev);
    }
    return out;
  });
  next.values[slotId] = padOrTrimCollectionValues(remapped, fixedLength, itemFields);

  return next;
}
