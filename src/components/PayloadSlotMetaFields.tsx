import { useEffect, useState } from "react";
import { message } from "@shoplazza/sds";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import {
  renameExternalVariableSlot,
  updateExternalVariableSlotLabel,
  updateExternalVariableSlotValueType,
} from "../lib/externalVariableSlotEdit";
import { isSceneCollectionPresetManagedSlot } from "../lib/sceneCollectionPresetSlot";
import {
  isStandardScalarValueType,
  type StandardScalarValueType,
} from "../payload-contract/standard-scalar-types";
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

type MetaFieldVariant = "default" | "production";

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
  const valueTypeDraft: StandardScalarValueType = isStandardScalarValueType(slot.valueType)
    ? slot.valueType
    : "string";

  const handleValueTypeChange = (nextType: StandardScalarValueType) => {
    if (nextType === slot.valueType) return;
    const next = updateExternalVariableSlotValueType(template, payload, slot.slotId, nextType);
    onPayloadChange(next.payload);
    onTemplatePayloadChange?.(next);
  };

  return {
    payload,
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

/** 顶栏：变量展示名称（与样式预设「预设名称」同级） */
export function PayloadSlotMetaNameField({ meta }: { meta: PayloadSlotMetaState }) {
  return (
    <Field label="变量名称" className="payload-inspector__label-field">
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
        aria-label="变量名称"
      />
    </Field>
  );
}

/** 滚动区：类型与标识 */
export function PayloadSlotMetaAttributesSection({
  meta,
  variant = "default",
}: {
  meta: PayloadSlotMetaState;
  variant?: MetaFieldVariant;
}) {
  const showHints = variant !== "production";
  const slotDef = meta.payload.slots[meta.slot.slotId];
  const slotIdReadonly = isSceneCollectionPresetManagedSlot(slotDef);
  return (
    <section className="inspector__section payload-inspector__attributes">
      {meta.showValueTypeSelect ? (
        <Field
          label="变量类型"
          {...(showHints
            ? {
                hint: "修改类型后会同步模板中的变量绑定，并按类型调整当前赋值形态。",
              }
            : {})}
        >
          <StandardScalarValueTypeSelect
            value={meta.valueTypeDraft}
            onChange={meta.handleValueTypeChange}
          />
        </Field>
      ) : null}
      <Field
        label="变量标识"
        {...(showHints
          ? {
              hint: slotIdReadonly
                ? "内置场景变量的标识不可修改。"
                : "字母开头，仅含字母、数字与下划线；修改后会同步更新模板绑定与插值占位符。",
            }
          : {})}
      >
        <ShopInput
          value={meta.slotIdDraft}
          placeholder="storeName"
          disabled={slotIdReadonly}
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

/** 标量变量：名称、标识、类型同区块（嵌在配置 Inspector 等场景） */
export function PayloadSlotMetaFields({
  variant = "default",
  ...props
}: PayloadSlotMetaFieldsProps & { variant?: MetaFieldVariant }) {
  const meta = usePayloadSlotMetaFields(props);
  const showHints = variant !== "production";
  return (
    <section className="payload-inspector__meta">
      {meta.showValueTypeSelect ? (
        <Field
          label="变量类型"
          {...(showHints
            ? {
                hint: "修改类型后会同步模板中的变量绑定，并按类型调整当前赋值形态。",
              }
            : {})}
        >
          <StandardScalarValueTypeSelect
            value={meta.valueTypeDraft}
            onChange={meta.handleValueTypeChange}
          />
        </Field>
      ) : null}
      <Field
        label="变量名称"
        {...(showHints
          ? {
              hint: "在左侧列表与属性面板中展示的名称。",
            }
          : {})}
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
        label="变量标识"
        {...(showHints
          ? {
              hint: "字母开头，仅含字母、数字与下划线；修改后会同步更新模板绑定与插值占位符。",
            }
          : {})}
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
