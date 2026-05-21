import { useMemo } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { filterSlotsForVariablePicker } from "../lib/variableSlotCompatibility";
import { PayloadVariablePickerModal } from "./PayloadVariablePickerModal";

export type TextBodyInlineVariableMode = "bind" | "create";

type Props = {
  visible: boolean;
  selectionPreview: string;
  slots: ExternalVariableSlotInfo[];
  payload: EmailPayload;
  onClose: () => void;
  onConfirmBind: (slot: ExternalVariableSlotInfo) => void;
  onConfirmCreate: (args: { slotId: string; label: string }) => void;
};

/** 正文选区设为文中变量：复用标量变量选择弹窗 */
export function TextBodyInlineVariableModal({
  visible,
  selectionPreview,
  slots,
  payload,
  onClose,
  onConfirmBind,
  onConfirmCreate,
}: Props) {
  const inlineTextSlots = useMemo(
    () => filterSlotsForVariablePicker(slots, "inlineText"),
    [slots]
  );

  return (
    <PayloadVariablePickerModal
      visible={visible}
      title="设为文中变量"
      previewLabel="当前选区"
      previewText={selectionPreview}
      slots={inlineTextSlots}
      payload={payload}
      onClose={onClose}
      onConfirmBind={onConfirmBind}
      onConfirmCreate={onConfirmCreate}
    />
  );
}
