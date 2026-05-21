import { useEffect, useMemo, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import type { TextBodyVariableRunMeta } from "../lib/textBodyEditorFormat";
import {
  filterSlotsForVariablePicker,
  slotValueTypeLabelForPicker,
} from "../lib/variableSlotCompatibility";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

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

type Props = {
  visible: boolean;
  meta: TextBodyVariableRunMeta | null;
  slots: ExternalVariableSlotInfo[];
  payload: EmailPayload;
  onClose: () => void;
  onConfirmSlot: (slot: ExternalVariableSlotInfo) => void;
  onDetach: () => void;
};

export function TextBodyVariablePillModal({
  visible,
  meta,
  slots,
  payload,
  onClose,
  onConfirmSlot,
  onDetach,
}: Props) {
  const pickerPurpose =
    meta?.textBindPath.endsWith(".link") || meta?.textBindPath.endsWith(".href")
      ? "inlineUrl"
      : "inlineText";
  const scalarSlots = useMemo(
    () => filterSlotsForVariablePicker(slots, pickerPurpose),
    [pickerPurpose, slots]
  );

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !meta) {
      setSelectedSlotId(null);
      return;
    }
    const current = meta.slotId;
    if (scalarSlots.some((s) => s.slotId === current)) {
      setSelectedSlotId(current);
      return;
    }
    setSelectedSlotId(scalarSlots[0]?.slotId ?? null);
  }, [visible, meta, scalarSlots]);

  const handleConfirm = () => {
    if (!selectedSlotId) return;
    const slot = scalarSlots.find((s) => s.slotId === selectedSlotId);
    if (!slot) return;
    onConfirmSlot(slot);
  };

  return (
    <ShopSectionModal
      title="文中变量"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-var-pill-modal-wrap"
      onCancel={onClose}
      footer={
        <>
          <ShopSecondaryButton htmlType="button" onClick={onDetach}>
            解除文中变量
          </ShopSecondaryButton>
          <div className="shop-section-modal__footer-actions">
            <ShopSecondaryButton htmlType="button" onClick={onClose}>
              取消
            </ShopSecondaryButton>
            <ShopPrimaryButton
              htmlType="button"
              disabled={!selectedSlotId || scalarSlots.length === 0}
              onClick={handleConfirm}
            >
              确定
            </ShopPrimaryButton>
          </div>
        </>
      }
    >
      {meta ? (
        <div className="text-body-var-pill-modal">
          <div className="shop-section-modal__selection-banner" title={meta.displayText}>
            当前：{meta.label}（{meta.slotId}）· {meta.displayText}
          </div>
          <p className="text-body-var-pill-modal__hint">
            在下方表格中单选一个 payload 变量后点「确定」完成绑定（不支持列表）。也可解除绑定，将当前预览文字烘焙为普通文本。
          </p>
          {scalarSlots.length === 0 ? (
            <p className="text-body-var-pill-modal__empty">当前邮件没有可绑定的标量变量，请先在变量赋值面板创建。</p>
          ) : (
            <div
              className="text-body-var-pill-modal__table-wrap"
              role="radiogroup"
              aria-label="可选 payload 变量"
            >
              <table className="text-body-var-pill-modal__table">
                <thead>
                  <tr>
                    <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--radio" scope="col">
                      <span className="text-body-var-pill-modal__sr-only">选择</span>
                    </th>
                    <th className="text-body-var-pill-modal__th" scope="col">
                      名称
                    </th>
                    <th className="text-body-var-pill-modal__th" scope="col">
                      标识
                    </th>
                    <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--type" scope="col">
                      类型
                    </th>
                    <th className="text-body-var-pill-modal__th" scope="col">
                      当前值
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scalarSlots.map((slot) => {
                    const selected = slot.slotId === selectedSlotId;
                    const displayValue = formatSlotDisplayValue(slot, payload);
                    return (
                      <tr
                        key={slot.slotId}
                        className={`text-body-var-pill-modal__row${selected ? " text-body-var-pill-modal__row--selected" : ""}`}
                        onClick={() => setSelectedSlotId(slot.slotId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedSlotId(slot.slotId);
                          }
                        }}
                        tabIndex={0}
                        role="radio"
                        aria-checked={selected}
                      >
                        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                          <input
                            type="radio"
                            name="text-body-var-pill-slot"
                            className="text-body-var-pill-modal__radio"
                            checked={selected}
                            onChange={() => setSelectedSlotId(slot.slotId)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`选择 ${slot.label ?? slot.slotId}`}
                          />
                        </td>
                        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                          {slot.label ?? slot.slotId}
                          {slot.slotId === meta.slotId ? (
                            <span className="text-body-var-pill-modal__badge">当前绑定</span>
                          ) : null}
                        </td>
                        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                          <code>{slot.slotId}</code>
                        </td>
                        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                            {slotValueTypeLabelForPicker(slot.valueType)}
                        </td>
                        <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value" title={displayValue}>
                          {displayValue}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </ShopSectionModal>
  );
}
