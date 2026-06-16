import type { BindingCollectionField } from "../types/email";
import type { SlotValueType } from "../payload-contract/types";
import { filterSlotsForVisibilityPicker } from "../payload-contract/variable-slot-compatibility";
import { isVisibilityConditionValueType } from "../visibility-contract";
import type { VisibilityRule } from "../visibility-contract";

export type VisibilitySlotCandidate = {
  key: string;
  slotId: string;
  valueType: SlotValueType;
  label: string;
  description?: string;
  objectFieldKey?: string;
  objectFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
};

export function visibilitySlotCandidateKey(slotId: string, objectFieldKey?: string): string {
  const fieldKey = objectFieldKey?.trim();
  return fieldKey ? `${slotId}::${fieldKey}` : slotId;
}

export function buildVisibilitySlotCandidates(
  slots: Array<{
    slotId: string;
    valueType: string;
    label?: string;
    description?: string;
    objectFields?: BindingCollectionField[];
    minItems?: number;
    maxItems?: number;
  }>
): VisibilitySlotCandidate[] {
  const rows: VisibilitySlotCandidate[] = [];

  for (const slot of filterSlotsForVisibilityPicker(slots)) {
    if (slot.valueType === "object") {
      const objectFields = slot.objectFields ?? [];
      for (const field of objectFields) {
        if (!isVisibilityConditionValueType(field.valueType)) continue;
        rows.push({
          key: visibilitySlotCandidateKey(slot.slotId, field.key),
          slotId: slot.slotId,
          valueType: field.valueType,
          objectFieldKey: field.key,
          objectFields,
          label: `${slot.label ?? slot.slotId} · ${field.label ?? field.key}`,
          description: slot.description,
        });
      }
      continue;
    }

    rows.push({
      key: slot.slotId,
      slotId: slot.slotId,
      valueType: slot.valueType as SlotValueType,
      label: slot.label ?? slot.slotId,
      description: slot.description,
      minItems: slot.minItems,
      maxItems: slot.maxItems,
    });
  }

  return rows.sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
}

export function findVisibilitySlotCandidate(
  candidates: VisibilitySlotCandidate[],
  rule: Pick<VisibilityRule, "slotId" | "objectFieldKey">
): VisibilitySlotCandidate | undefined {
  return candidates.find(
    (candidate) =>
      candidate.key === visibilitySlotCandidateKey(rule.slotId, rule.objectFieldKey)
  );
}

export function visibilityRuleFromCandidate(candidate: VisibilitySlotCandidate): VisibilityRule {
  const operator =
    candidate.valueType === "boolean"
      ? "isTrue"
      : candidate.valueType === "collection"
        ? "isNotEmpty"
        : "isNotEmpty";

  return {
    slotId: candidate.slotId,
    valueType: candidate.valueType,
    operator,
    objectFieldKey: candidate.objectFieldKey,
    objectFields: candidate.objectFields,
    minItems: candidate.minItems,
    maxItems: candidate.maxItems,
    label: candidate.label,
    description: candidate.description,
  };
}
