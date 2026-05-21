import type { BindingCollectionField } from "../types/email";
import type { ExternalVariableSlotInfo } from "./payloadSlots";
import type { PayloadSlotDraft } from "./payloadSlotDraft";

/** 合并 payload.slots 与草稿中的 itemFields（草稿优先） */
export function resolveEffectiveCollectionItemFields(
  slot: Pick<ExternalVariableSlotInfo, "itemFields">,
  draft?: PayloadSlotDraft | null
): BindingCollectionField[] {
  return draft?.slotDefPatch?.itemFields ?? slot.itemFields ?? [];
}
