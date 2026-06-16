import type { EmailPayload } from "../types/email";
import { isBuiltinStructureSlot } from "./builtinStructureSlot";
import { isSceneCollectionPresetManagedSlot } from "./sceneCollectionPresetSlot";

/** 变量赋值面板内是否只读（内置 mock 结构与取值，不提供保存/改值）。 */
export function isPayloadSlotEditorReadonly(payload: EmailPayload, slotId: string): boolean {
  const entry = payload.slots[slotId];
  if (!entry) return true;
  return isBuiltinStructureSlot(entry) || isSceneCollectionPresetManagedSlot(entry);
}
