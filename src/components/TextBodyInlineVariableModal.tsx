import { useMemo } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { filterSlotsForVariablePicker } from "../payload-contract/variable-slot-compatibility";
import { PayloadVariablePickerModal } from "./PayloadVariablePickerModal";

type Props = {
  visible: boolean;
  selectionPreview: string;
  slots: ExternalVariableSlotInfo[];
  payload: EmailPayload;
  onClose: () => void;
  onConfirmBind: (slot: ExternalVariableSlotInfo) => void;
};

/** 正文选区设为文中变量：仅绑定已有标量变量（非列表、非对象） */
export function TextBodyInlineVariableModal({
  visible,
  selectionPreview,
  slots,
  payload,
  onClose,
  onConfirmBind,
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
    />
  );
}
