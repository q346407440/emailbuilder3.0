import { useEffect, useState } from "react";
import { toastError } from "../lib/appToast";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import {
  renameExternalVariableSlot,
  updateExternalVariableSlotLabel,
} from "../lib/externalVariableSlotEdit";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import {
  builtinStructureScopeLabel,
  getPayloadSlotBuiltinStructure,
} from "../lib/builtinStructureSlot";
import { Field } from "./ui/Field";
import { ShopInput } from "./ui/ShopFormControls";

export type PayloadSlotMetaFieldsProps = {
  slot: ExternalVariableSlotInfo;
  template: EmailTemplate;
  payload: EmailPayload;
  onPayloadChange: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onSlotIdChange?: (slotId: string) => void;
  /** 内置 mock 变量：名称等元信息只读 */
  labelReadonly?: boolean;
};

type MetaFieldVariant = "default" | "production";

export function usePayloadSlotMetaFields({
  slot,
  template,
  payload,
  onPayloadChange,
  onTemplatePayloadChange,
  onSlotIdChange,
  labelReadonly = false,
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
    if (labelReadonly) return;
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
      toastError(result.error);
      return;
    }
    setMetaError("");
    onTemplatePayloadChange?.({ template: result.template, payload: result.payload });
    onSlotIdChange?.(nextId);
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
    slot,
    labelReadonly,
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
        disabled={meta.labelReadonly}
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
  const structure = getPayloadSlotBuiltinStructure(slotDef);
  const readonlySlotIdentity = true;
  return (
    <section className="inspector__section payload-inspector__attributes">
      <Field
        label="变量类型"
        {...(showHints
          ? {
              hint: "变量类型由内置数据结构决定，不可修改。",
            }
          : {})}
      >
        <ShopInput value={payloadSlotValueTypeLabel(meta.slot.valueType)} disabled />
      </Field>
      <Field
        label="变量标识"
        {...(showHints
          ? {
              hint: "变量标识由系统固定；外部系统按此标识传入对应数据。",
            }
          : {})}
      >
        <ShopInput
          value={meta.slotIdDraft}
          placeholder="storeName"
          disabled={readonlySlotIdentity}
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
      {structure ? (
        <Field label="结构范围">
          <ShopInput value={builtinStructureScopeLabel(structure)} disabled />
        </Field>
      ) : null}
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
  const slotDef = meta.payload.slots[meta.slot.slotId];
  const structure = getPayloadSlotBuiltinStructure(slotDef);
  const readonlySlotIdentity = true;
  return (
    <section className="payload-inspector__meta">
      <Field
        label="变量类型"
        {...(showHints
          ? {
              hint: "变量类型由内置数据结构决定，不可修改。",
            }
          : {})}
      >
        <ShopInput value={payloadSlotValueTypeLabel(meta.slot.valueType)} disabled />
      </Field>
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
          disabled={meta.labelReadonly}
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
              hint: "变量标识由系统固定；外部系统按此标识传入对应数据。",
            }
          : {})}
      >
        <ShopInput
          value={meta.slotIdDraft}
          placeholder="storeName"
          disabled={readonlySlotIdentity}
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
      {structure ? (
        <Field label="结构范围">
          <ShopInput value={builtinStructureScopeLabel(structure)} disabled />
        </Field>
      ) : null}
      {meta.metaError ? <p className="payload-inspector__meta-error">{meta.metaError}</p> : null}
    </section>
  );
}
