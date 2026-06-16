import type { BindingCollectionField } from "../../types/email";
import type { SlotValueType } from "../types";

export type BuiltinVariableScope = "general" | "dedicated";

export type BuiltinVariableLengthPolicy =
  | { kind: "editable"; defaultLength?: number }
  | { kind: "locked"; fixedLength: number };

export type BuiltinStructureDefinition = {
  structureId: string;
  scope: BuiltinVariableScope;
  dedicatedFor?: "loyalty-internal-admin";
  defaultSlotId: string;
  label: string;
  description?: string;
  valueType: SlotValueType;
  seedValue?: unknown;
  objectFields?: BindingCollectionField[];
  itemFields?: BindingCollectionField[];
  seedValues?: Record<string, unknown>[];
  lengthPolicy?: BuiltinVariableLengthPolicy;
};

export type BuiltinStructureSummary = {
  structureId: string;
  scope: BuiltinVariableScope;
  dedicatedFor?: BuiltinStructureDefinition["dedicatedFor"];
  defaultSlotId: string;
  label: string;
  description?: string;
  valueType: SlotValueType;
  defaultPreviewRowCount?: number;
  objectFieldCount?: number;
  lengthPolicy?: BuiltinVariableLengthPolicy;
};
