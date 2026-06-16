import type { BindingCollectionField, EmailPayload } from "../types/email";
import { findObjectFieldByPath, scalarObjectFields } from "../payload-contract/object-fields";
import {
  buildRepeatListScalarFieldPickerRows,
  type CollectionFieldPickerOption,
  type CollectionJsonSample,
} from "./collectionFieldMapping";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 从 payload 对象槽取值构建字段映射样本 */
export function objectSampleFromPayloadValues(
  payload: EmailPayload | null,
  slotId: string,
  objectFields: BindingCollectionField[]
): CollectionJsonSample | null {
  const raw = payload?.values?.[slotId];
  if (!isRecord(raw)) return null;
  const keys = scalarObjectFields(objectFields).map((field) => field.key);
  return { keys, firstItem: raw };
}

export function buildObjectScalarFieldPickerRows(
  objectFields: BindingCollectionField[],
  sample: CollectionJsonSample | null
): CollectionFieldPickerOption[] {
  return buildRepeatListScalarFieldPickerRows(sample, objectFields);
}

export function buildObjectFieldMappings(
  objectFields: BindingCollectionField[],
  targetOptions: Array<{ key: string; blockId: string; bindPath: string }>,
  draft: Record<string, string>
): import("../types/email").RepeatFieldMapping[] {
  return targetOptions.flatMap((target) => {
    const sourcePath = draft[target.key]?.trim();
    if (!sourcePath) return [];
    const sourceField = findObjectFieldByPath(objectFields, sourcePath);
    if (!sourceField || sourceField.valueType === "collection") return [];
    return {
      id: `${target.blockId}.${target.bindPath}:object:${sourceField.key}`,
      sourcePath,
      targetBlockId: target.blockId,
      targetBindPath: target.bindPath,
      label: sourceField.label || sourceField.key,
      valueType: sourceField.valueType,
    };
  });
}

export function objectMappingDraftFromSaved(
  objectFields: BindingCollectionField[],
  targetOptions: Array<{ key: string; blockId: string; bindPath: string }>,
  currentMappings?: import("../types/email").RepeatFieldMapping[]
): Record<string, string> {
  const draft: Record<string, string> = {};
  const currentByTarget = new Map(
    (currentMappings ?? []).map((mapping) => [
      `${mapping.targetBlockId}:${mapping.targetBindPath}`,
      mapping.sourcePath,
    ])
  );
  for (const target of targetOptions) {
    const current = currentByTarget.get(target.key);
    if (current && findObjectFieldByPath(objectFields, current)) {
      draft[target.key] = current;
    }
  }
  return draft;
}
