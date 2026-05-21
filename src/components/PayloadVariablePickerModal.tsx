import { useEffect, useMemo, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { isPayloadSlotIdTaken } from "../lib/payloadSlotRegister";
import { SLOT_ID_PATTERN } from "../payload-contract/value-types";
import { slotValueTypeLabelForPicker } from "../lib/variableSlotCompatibility";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
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

export type PayloadVariablePickerMode = "bind" | "create";

export type PayloadVariablePickerModalProps = {
  visible: boolean;
  title: string;
  previewLabel?: string;
  previewText: string;
  slots: ExternalVariableSlotInfo[];
  payload: EmailPayload;
  defaultSelectedSlotId?: string | null;
  allowCreate?: boolean;
  onClose: () => void;
  onConfirmBind: (slot: ExternalVariableSlotInfo) => void;
  onConfirmCreate: (args: { slotId: string; label: string }) => void;
};

export function PayloadVariablePickerModal({
  visible,
  title,
  previewLabel = "当前内容",
  previewText,
  slots,
  payload,
  defaultSelectedSlotId = null,
  allowCreate = true,
  onClose,
  onConfirmBind,
  onConfirmCreate,
}: PayloadVariablePickerModalProps) {
  const scalarSlots = slots;

  const [mode, setMode] = useState<PayloadVariablePickerMode>("bind");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotIdDraft, setSlotIdDraft] = useState("");
  const [labelDraft, setLabelDraft] = useState("");
  const [slotIdError, setSlotIdError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!visible) {
      setMode(scalarSlots.length > 0 ? "bind" : "create");
      setSelectedSlotId(null);
      setSlotIdDraft("");
      setLabelDraft("");
      setSlotIdError("");
      setFormError("");
      return;
    }
    const initialMode = scalarSlots.length > 0 ? "bind" : "create";
    setMode(allowCreate ? initialMode : "bind");
    const preferred =
      defaultSelectedSlotId && scalarSlots.some((s) => s.slotId === defaultSelectedSlotId)
        ? defaultSelectedSlotId
        : (scalarSlots[0]?.slotId ?? null);
    setSelectedSlotId(preferred);
    setSlotIdDraft("");
    setLabelDraft(previewText.trim() || "");
    setSlotIdError("");
    setFormError("");
  }, [allowCreate, defaultSelectedSlotId, previewText, scalarSlots, visible]);

  const slotIdTrimmed = slotIdDraft.trim();
  const slotIdDuplicate =
    mode === "create" && slotIdTrimmed.length > 0 && isPayloadSlotIdTaken(payload, slotIdTrimmed);

  const validateCreateSlotId = (): boolean => {
    if (!slotIdTrimmed) {
      setSlotIdError("请输入变量标识（key）。");
      return false;
    }
    if (!SLOT_ID_PATTERN.test(slotIdTrimmed)) {
      setSlotIdError("变量标识须以字母开头，且只能包含字母、数字和下划线。");
      return false;
    }
    if (isPayloadSlotIdTaken(payload, slotIdTrimmed)) {
      setSlotIdError("该变量标识已存在，请使用其他 key。");
      return false;
    }
    setSlotIdError("");
    return true;
  };

  const handleConfirm = () => {
    setFormError("");
    if (!previewText.trim()) {
      setFormError("当前内容为空，无法绑定变量。");
      return;
    }
    if (mode === "bind") {
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
      return;
    }
    if (!validateCreateSlotId()) return;
    onConfirmCreate({ slotId: slotIdTrimmed, label: labelDraft.trim() || slotIdTrimmed });
  };

  const slotIdErrorText =
    slotIdError || (slotIdDuplicate ? "该变量标识已存在，请使用其他 key。" : "");
  const showSlotIdError = Boolean(slotIdErrorText);

  return (
    <ShopSectionModal
      title={title}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton
            htmlType="button"
            disabled={mode === "bind" && scalarSlots.length === 0}
            onClick={handleConfirm}
          >
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="text-body-inline-var-modal">
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

        {allowCreate ? (
          <div className="text-body-inline-var-modal__mode-tabs" role="tablist" aria-label="变量操作方式">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "bind"}
              disabled={scalarSlots.length === 0}
              className={`text-body-inline-var-modal__mode-tab${mode === "bind" ? " text-body-inline-var-modal__mode-tab--active" : ""}`}
              onClick={() => setMode("bind")}
            >
              绑定已有变量
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "create"}
              className={`text-body-inline-var-modal__mode-tab${mode === "create" ? " text-body-inline-var-modal__mode-tab--active" : ""}`}
              onClick={() => setMode("create")}
            >
              创建新变量
            </button>
          </div>
        ) : null}

        {mode === "bind" ? (
          scalarSlots.length === 0 ? (
            <p className="text-body-var-pill-modal__empty">
              当前没有符合该字段类型的可绑定变量{allowCreate ? "，请切换到「创建新变量」。" : "。"}
            </p>
          ) : (
            <>
              <p className="text-body-var-pill-modal__hint">
                在下方表格中单选一个变量后点「确定」。列表类（collection）变量不在此选择。
              </p>
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
                              name="payload-var-picker-slot"
                              className="text-body-var-pill-modal__radio"
                              checked={selected}
                              onChange={() => setSelectedSlotId(slot.slotId)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`选择 ${slot.label ?? slot.slotId}`}
                            />
                          </td>
                          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                            {slot.label ?? slot.slotId}
                          </td>
                          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                            <code>{slot.slotId}</code>
                          </td>
                          <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                            {slotValueTypeLabelForPicker(slot.valueType)}
                          </td>
                          <td
                            className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                            title={displayValue}
                          >
                            {displayValue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          <div className="text-body-inline-var-modal__create">
            <p className="text-body-var-pill-modal__hint">
              将使用当前字段内容作为变量初值；名称与 key 写入 payload.slots。
            </p>
            <p className="text-body-inline-var-modal__value-preview">
              变量初值：<strong>{previewText.trim() || "—"}</strong>
            </p>
            <label className="text-rich-editor__link-label" htmlFor="payload-var-picker-label">
              变量名称
            </label>
            <ShopInput
              id="payload-var-picker-label"
              value={labelDraft}
              placeholder="例如：店铺名称"
              onChange={(e) => {
                setLabelDraft(e.target.value);
                if (formError) setFormError("");
              }}
            />
            <label className="text-rich-editor__link-label" htmlFor="payload-var-picker-slot-id">
              变量标识（key）
            </label>
            <ShopInput
              id="payload-var-picker-slot-id"
              value={slotIdDraft}
              placeholder="storeName"
              aria-invalid={showSlotIdError}
              aria-describedby={showSlotIdError ? "payload-var-picker-slot-id-err" : undefined}
              onChange={(e) => {
                setSlotIdDraft(e.target.value);
                if (slotIdError) setSlotIdError("");
                if (formError) setFormError("");
              }}
            />
            {showSlotIdError ? (
              <p id="payload-var-picker-slot-id-err" className="text-rich-editor__link-error" role="alert">
                {slotIdErrorText}
              </p>
            ) : (
              <p className="text-rich-editor__link-tip">key 须在 payload.slots 中唯一。</p>
            )}
          </div>
        )}

        {formError ? (
          <p className="text-body-inline-var-modal__error" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
