import type {
  BindingCollectionScalarField,
  EmailTemplate,
  ObjectRegionBinding,
  RepeatFieldMapping,
} from "../types/email";
import { findObjectFieldByPath } from "../payload-contract/object-fields";
import { sanitizeListRepeatUserLabel } from "./repeatNestedBindingUi";

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  const raw = template.blockMeta?.[blockId]?.name?.trim() || blockId;
  return sanitizeListRepeatUserLabel(raw);
}

/** 预览列字段：派生自 payload 真源 BindingCollectionField 的标量成员，携带 valueType 供预览正确渲染。 */
export type ObjectBindingPreviewField = BindingCollectionScalarField;

/** 预览区优先展示已映射字段，再补未映射标量列 */
export function objectBindingPreviewFields(objectBind: ObjectRegionBinding): ObjectBindingPreviewField[] {
  const out: ObjectBindingPreviewField[] = [];
  const seen = new Set<string>();
  for (const mapping of objectBind.fieldMappings ?? []) {
    const key = mapping.sourcePath;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const declared = findObjectFieldByPath(objectBind.objectFields, key);
    const vt = mapping.valueType ?? declared?.valueType;
    out.push({
      key,
      label: mapping.label?.trim() || declared?.label?.trim() || key,
      valueType: vt && vt !== "collection" ? vt : "string",
    });
  }
  for (const field of objectBind.objectFields ?? []) {
    if (field.valueType === "collection") continue;
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    out.push({ key: field.key, label: field.label?.trim() || field.key, valueType: field.valueType });
  }
  return out;
}

export function objectBindingOverviewHostLabel(template: EmailTemplate, hostId: string): string {
  return blockDisplayName(template, hostId);
}

export function objectBindingMappingRows(
  objectBind: ObjectRegionBinding,
  formatLine: (mapping: RepeatFieldMapping) => string
): string[] {
  return (objectBind.fieldMappings ?? []).map((mapping) => formatLine(mapping));
}
