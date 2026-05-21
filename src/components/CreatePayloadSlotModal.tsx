import { useEffect, useState } from "react";
import type { EmailPayload } from "../types/email";
import {
  createCollectionPayloadSlot,
  createScalarPayloadSlot,
  validateNewPayloadSlotFields,
} from "../lib/createPayloadSlot";
import type { StandardScalarValueType } from "../lib/standardScalarSlotTypes";
import { StandardScalarValueTypeSelect } from "./StandardScalarValueTypeSelect";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

export type CreatePayloadSlotModalMode = "scalar" | "collection";

export type CreatePayloadSlotModalProps = {
  mode: CreatePayloadSlotModalMode;
  visible: boolean;
  payload: EmailPayload;
  onClose: () => void;
  onConfirm: (args: { slotId: string; payload: EmailPayload }) => void;
};

export function CreatePayloadSlotModal({
  mode,
  visible,
  payload,
  onClose,
  onConfirm,
}: CreatePayloadSlotModalProps) {
  const [labelDraft, setLabelDraft] = useState("");
  const [slotIdDraft, setSlotIdDraft] = useState("");
  const [valueTypeDraft, setValueTypeDraft] = useState<StandardScalarValueType>("string");
  const [initialValueDraft, setInitialValueDraft] = useState("");
  const [labelError, setLabelError] = useState("");
  const [slotIdError, setSlotIdError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setLabelDraft("");
    setSlotIdDraft("");
    setValueTypeDraft("string");
    setInitialValueDraft("");
    setLabelError("");
    setSlotIdError("");
    setFormError("");
  }, [mode, visible]);

  const title = mode === "scalar" ? "创建标准变量" : "创建列表变量";
  const hint =
    mode === "scalar"
      ? "名称与 key 写入 payload.slots；初值可选，写入 payload.values。"
      : "名称与 key 写入 payload.slots；列表字段与数据创建后可在右侧「变量详情」中配置。";

  const handleConfirm = () => {
    setFormError("");
    const fieldErrors = validateNewPayloadSlotFields(payload, slotIdDraft, labelDraft);
    setLabelError(fieldErrors.label ?? "");
    setSlotIdError(fieldErrors.slotId ?? "");
    if (fieldErrors.label || fieldErrors.slotId) return;

    const result =
      mode === "scalar"
        ? createScalarPayloadSlot(payload, {
            slotId: slotIdDraft,
            label: labelDraft,
            valueType: valueTypeDraft,
            initialValue: initialValueDraft,
          })
        : createCollectionPayloadSlot(payload, {
            slotId: slotIdDraft,
            label: labelDraft,
          });

    if ("error" in result) {
      if (result.fieldErrors?.label) setLabelError(result.fieldErrors.label);
      if (result.fieldErrors?.slotId) setSlotIdError(result.fieldErrors.slotId);
      setFormError(result.error);
      return;
    }

    onConfirm({ slotId: slotIdDraft.trim(), payload: result.payload });
  };

  return (
    <ShopSectionModal
      title={title}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" onClick={handleConfirm}>
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="text-body-inline-var-modal create-payload-slot-modal">
        <p className="text-body-var-pill-modal__hint">{hint}</p>

        {mode === "scalar" ? (
          <>
            <label className="text-rich-editor__link-label" htmlFor="create-payload-slot-type">
              变量类型
            </label>
            <StandardScalarValueTypeSelect
              id="create-payload-slot-type"
              value={valueTypeDraft}
              onChange={setValueTypeDraft}
            />

            <label className="text-rich-editor__link-label" htmlFor="create-payload-slot-initial">
              变量初值
            </label>
            <ShopInput
              id="create-payload-slot-initial"
              value={initialValueDraft}
              type={valueTypeDraft === "number" ? "number" : "text"}
              placeholder={
                valueTypeDraft === "number"
                  ? "可选，例如 100"
                  : valueTypeDraft === "url"
                    ? "可选，例如 https://example.com"
                    : "可选，留空则不写入 payload.values"
              }
              onChange={(e) => {
                setInitialValueDraft(e.target.value);
                if (formError) setFormError("");
              }}
            />
          </>
        ) : null}

        <label className="text-rich-editor__link-label" htmlFor="create-payload-slot-label">
          变量名称
        </label>
        <ShopInput
          id="create-payload-slot-label"
          value={labelDraft}
          placeholder="例如：店铺名称"
          aria-invalid={Boolean(labelError)}
          aria-describedby={labelError ? "create-payload-slot-label-err" : undefined}
          onChange={(e) => {
            setLabelDraft(e.target.value);
            if (labelError) setLabelError("");
            if (formError) setFormError("");
          }}
        />
        {labelError ? (
          <p id="create-payload-slot-label-err" className="text-rich-editor__link-error" role="alert">
            {labelError}
          </p>
        ) : null}

        <label className="text-rich-editor__link-label" htmlFor="create-payload-slot-id">
          变量标识（key）
        </label>
        <ShopInput
          id="create-payload-slot-id"
          value={slotIdDraft}
          placeholder="storeName"
          aria-invalid={Boolean(slotIdError)}
          aria-describedby={slotIdError ? "create-payload-slot-id-err" : "create-payload-slot-id-tip"}
          onChange={(e) => {
            setSlotIdDraft(e.target.value);
            if (slotIdError) setSlotIdError("");
            if (formError) setFormError("");
          }}
        />
        {slotIdError ? (
          <p id="create-payload-slot-id-err" className="text-rich-editor__link-error" role="alert">
            {slotIdError}
          </p>
        ) : (
          <p id="create-payload-slot-id-tip" className="text-rich-editor__link-tip">
            key 须在 payload.slots 中唯一。
          </p>
        )}

        {formError && !labelError && !slotIdError ? (
          <p className="text-body-inline-var-modal__error" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
