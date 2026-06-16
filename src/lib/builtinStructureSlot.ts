import type { PayloadSlotDefinition } from "../types/email";
import {
  getBuiltinStructureDefinition,
  type BuiltinStructureDefinition,
} from "../payload-contract/builtin-structure-catalog";

export function getPayloadSlotBuiltinStructure(
  slot: PayloadSlotDefinition | undefined
): BuiltinStructureDefinition | undefined {
  return getBuiltinStructureDefinition(slot?.builtinStructureId);
}

export function isBuiltinStructureSlot(slot: PayloadSlotDefinition | undefined): boolean {
  return Boolean(getPayloadSlotBuiltinStructure(slot));
}

export function builtinStructureScopeLabel(
  structure: BuiltinStructureDefinition | undefined
): string {
  if (!structure) return "自定义";
  if (structure.scope === "general") return "通用";
  if (structure.dedicatedFor === "loyalty-internal-admin") return "loyalty 内部后台专用";
  return "专用";
}
