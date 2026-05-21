import { useEffect, useState } from "react";
import { message } from "@shoplazza/sds";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import {
  renameExternalVariableSlot,
  updateExternalVariableSlotLabel,
  updateExternalVariableSlotValueType,
} from "../lib/externalVariableSlotEdit";
import {
  isStandardScalarValueType,
  type StandardScalarValueType,
} from "../lib/standardScalarSlotTypes";
import { StandardScalarValueTypeSelect } from "./StandardScalarValueTypeSelect";
import { Field } from "./ui/Field";
import { ShopInput } from "./ui/ShopFormControls";

export type PayloadSlotMetaFieldsProps = {
  slot: ExternalVariableSlotInfo;
  template: EmailTemplate;
  payload: EmailPayload;
  onPayloadChange: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onSlotIdChange?: (slotId: string) => void;
};

export function usePayloadSlotMetaFields({
  slot,
  template,
  payload,
  onPayloadChange,
  onTemplatePayloadChange,
  onSlotIdChange,
}: PayloadSlotMetaFieldsProps) {
  const [labelDraft, setLabelDraft] = useState(slot.label ?? "");
  const [slotIdDraft, setSlotIdDraft] = useState(slot.slotId);
  const [metaError, setMetaError] = useState("");

  useEffect(() => {
    setLabelDraft(slot.label ?? "");
    setSlotIdDraft(slot.slotId);
    setMetaError("");
  }, [slot.slotId, slot.label]);

  const commitLabel = () => {
    const nextLabel = labelDraft.trim();
    if (nextLabel === (slot.label ?? "").trim()) return;
    const nextPayload = updateExternalVariableSlotLabel(payload, slot.slotId, nextLabel);
    onPayloadChange(nextPayload);
    onTemplatePayloadChange?.({ template, payload: nextPayload });
  };

  const commitSlotId = () => {
    const nextId = slotIdDraft.trim();
    if (nextId === slot.slotId) return;
    const result = renameExternalVariableSlot(template, payload, slot.slotId, nextId);
    if (result.error) {
      setMetaError(result.error);
      setSlotIdDraft(slot.slotId);
      message.error(result.error);
      return;
    }
    setMetaError("");
    onTemplatePayloadChange?.({ template: result.template, payload: result.payload });
    onSlotIdChange?.(nextId);
  };

  const showValueTypeSelect = isStandardScalarValueType(slot.valueType);
  const valueTypeDraft: StandardScalarValueType = showValueTypeSelect ? slot.valueType : "string";

  const handleValueTypeChange = (nextType: StandardScalarValueType) => {
    if (nextType === slot.valueType) return;
    const next = updateExternalVariableSlotValueType(template, payload, slot.slotId, nextType);
    onPayloadChange(next.payload);
    onTemplatePayloadChange?.(next);
  };

  return {
    labelDraft,
    setLabelDraft,
    commitLabel,
    slotIdDraft,
    setSlotIdDraft,
    setMetaError,
    commitSlotId,
    metaError,
    showValueTypeSelect,
    valueTypeDraft,
    handleValueTypeChange,
    slot,
  };
}

export type PayloadSlotMetaState = ReturnType<typeof usePayloadSlotMetaFields>;

export function PayloadSlotMetaLabelSection({ meta }: { meta: PayloadSlotMetaState }) {
  return (
    <section className="payload-inspector__meta">
      {meta.showValueTypeSelect ? (
        <Field
          label="变量类型"
          hint="写入 payload.slots.valueType；修改后会同步模板中的变量绑定，并按类型调整当前赋值形态。"
        >
          <StandardScalarValueTypeSelect
            value={meta.valueTypeDraft}
            onChange={meta.handleValueTypeChange}
          />
        </Field>
      ) : null}
      <Field
        label="变量名称"
        hint="在左侧列表与 Inspector 中展示；写入 payload.slots（变量目录唯一真源）。"
      >
        <ShopInput
          value={meta.labelDraft}
          placeholder={meta.slot.slotId}
          onChange={(e) => meta.setLabelDraft(e.target.value)}
          onBlur={meta.commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              meta.commitLabel();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </Field>
    </section>
  );
}

export function PayloadSlotMetaSlotIdSection({ meta }: { meta: PayloadSlotMetaState }) {
  return (
    <section className="payload-inspector__meta payload-inspector__meta--slotid">
      <Field
        label="变量标识（slotId）"
        hint="字母开头，仅含字母、数字、下划线；修改后同步更新模板绑定、插值占位符与 payload 键名。"
      >
        <ShopInput
          value={meta.slotIdDraft}
          placeholder="storeName"
          onChange={(e) => {
            meta.setSlotIdDraft(e.target.value);
            meta.setMetaError("");
          }}
          onBlur={meta.commitSlotId}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              meta.commitSlotId();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </Field>
      {meta.metaError ? <p className="payload-inspector__meta-error">{meta.metaError}</p> : null}
    </section>
  );
}

/** 标量变量：名称、标识、类型同区块 */
export function PayloadSlotMetaFields(props: PayloadSlotMetaFieldsProps) {
  const meta = usePayloadSlotMetaFields(props);
  return (
    <section className="payload-inspector__meta">
      {meta.showValueTypeSelect ? (
        <Field
          label="变量类型"
          hint="写入 payload.slots.valueType；修改后会同步模板中的变量绑定，并按类型调整当前赋值形态。"
        >
          <StandardScalarValueTypeSelect
            value={meta.valueTypeDraft}
            onChange={meta.handleValueTypeChange}
          />
        </Field>
      ) : null}
      <Field
        label="变量名称"
        hint="在左侧列表与 Inspector 中展示；写入 payload.slots（变量目录唯一真源）。"
      >
        <ShopInput
          value={meta.labelDraft}
          placeholder={meta.slot.slotId}
          onChange={(e) => meta.setLabelDraft(e.target.value)}
          onBlur={meta.commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              meta.commitLabel();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </Field>
      <Field
        label="变量标识（slotId）"
        hint="字母开头，仅含字母、数字、下划线；修改后同步更新模板绑定、插值占位符与 payload 键名。"
      >
        <ShopInput
          value={meta.slotIdDraft}
          placeholder="storeName"
          onChange={(e) => {
            meta.setSlotIdDraft(e.target.value);
            meta.setMetaError("");
          }}
          onBlur={meta.commitSlotId}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              meta.commitSlotId();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </Field>
      {meta.metaError ? <p className="payload-inspector__meta-error">{meta.metaError}</p> : null}
    </section>
  );
}
