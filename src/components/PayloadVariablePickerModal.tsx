import { useEffect, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { slotValueTypeLabelForPicker } from "../payload-contract/variable-slot-compatibility";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { SelectablePickerTable } from "./ui/SelectablePickerTable";
import { ShopSectionModal } from "./ui/ShopSectionModal";

const EMPTY_MESSAGE =
  "当前没有符合该字段类型的可绑定变量，请先在变量列表中点击「添加变量」。";

function formatSlotDisplayValue(slot: ExternalVariableSlotInfo, payload: EmailPayload): string {
  const detached = payload.detachedVariableSlotIds?.includes(slot.slotId);
  if (detached) return "（已解除外部绑定）";

  const raw = payload.values[slot.slotId];
  const value = raw !== undefined && raw !== null && raw !== "" ? raw : slot.defaultValue;
  if (value === undefined || value === null || value === "") return "—";

  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return "—";
    return t.length > 160 ? `${t.slice(0, 157)}…` : t;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  } catch {
    return String(value);
  }
}

export type PayloadVariablePickerModalProps = {
  visible: boolean;
  title: string;
  previewLabel?: string;
  previewText: string;
  slots: ExternalVariableSlotInfo[];
  payload: EmailPayload;
  defaultSelectedSlotId?: string | null;
  onClose: () => void;
  onConfirmBind: (slot: ExternalVariableSlotInfo) => void;
};

/** 标量变量选择器：仅绑定已有变量，不支持在弹窗内新建变量。 */
export function PayloadVariablePickerModal({
  visible,
  title,
  previewLabel = "当前内容",
  previewText,
  slots,
  payload,
  defaultSelectedSlotId = null,
  onClose,
  onConfirmBind,
}: PayloadVariablePickerModalProps) {
  const scalarSlots = slots;

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!visible) {
      setSelectedSlotId(null);
      setFormError("");
      return;
    }
    const preferred =
      defaultSelectedSlotId && scalarSlots.some((s) => s.slotId === defaultSelectedSlotId)
        ? defaultSelectedSlotId
        : (scalarSlots[0]?.slotId ?? null);
    setSelectedSlotId(preferred);
    setFormError("");
  }, [defaultSelectedSlotId, scalarSlots, visible]);

  const handleConfirm = () => {
    setFormError("");
    if (!previewText.trim()) {
      setFormError("当前内容为空，无法绑定变量。");
      return;
    }
    if (!selectedSlotId) {
      setFormError("请选择一个已有变量。");
      return;
    }
    const slot = scalarSlots.find((s) => s.slotId === selectedSlotId);
    if (!slot) {
      setFormError("所选变量不可用。");
      return;
    }
    onConfirmBind(slot);
  };

  return (
    <ShopSectionModal
      title={title}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-var-pill-modal-wrap shop-section-modal-wrap--picker"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton
            htmlType="button"
            disabled={scalarSlots.length === 0}
            onClick={handleConfirm}
          >
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="text-body-var-pill-modal">
        <div
          className={
            previewText.trim()
              ? "shop-section-modal__selection-banner"
              : "shop-section-modal__selection-banner shop-section-modal__selection-banner--placeholder"
          }
          title={previewText || undefined}
        >
          {previewText.trim() ? (
            <>
              {previewLabel}：{previewText}
            </>
          ) : (
            <>{previewLabel}：（无内容）</>
          )}
        </div>

        <Field label="选择变量" className="inspector-field--modal-table">
          <p className="text-body-var-pill-modal__hint">
            在下方表格中单选一个变量后点「确定」。列表类（collection）变量不在此选择。
          </p>
          <SelectablePickerTable
            ariaLabel="可选 payload 变量"
            rowKey={(slot) => slot.slotId}
            selectedKey={selectedSlotId}
            onSelect={setSelectedSlotId}
            radioName="payload-var-picker-slot"
            dataSource={scalarSlots}
            emptyText={
              <p className="text-body-var-pill-modal__empty">{EMPTY_MESSAGE}</p>
            }
            columns={[
              {
                key: "label",
                title: "名称",
                render: (slot) => slot.label ?? slot.slotId,
              },
              {
                key: "id",
                title: "标识",
                render: (slot) => (
                  <code className="selectable-picker-table__mono">{slot.slotId}</code>
                ),
              },
              {
                key: "type",
                title: "类型",
                width: 72,
                render: (slot) => slotValueTypeLabelForPicker(slot.valueType),
              },
              {
                key: "value",
                title: "当前值",
                ellipsis: true,
                render: (slot) => {
                  const displayValue = formatSlotDisplayValue(slot, payload);
                  return <span title={displayValue}>{displayValue}</span>;
                },
              },
            ]}
          />
        </Field>

        {formError ? (
          <p className="text-body-inline-var-modal__error" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
