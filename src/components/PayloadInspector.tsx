import { useEffect, useMemo, useState } from "react";
import { message } from "@shoplazza/sds";
import type { EmailPayload, EmailTemplate } from "../types/email";
import {
  collectPayloadVariableSlots,
  type ExternalVariableSlotInfo,
} from "../lib/payloadSlots";
import { CollectionDataSourceBindModal } from "./CollectionDataSourceBindModal";
import { CollectionVariablePanel } from "./CollectionVariablePanel";
import {
  draftToCollectionSnapshot,
  patchCollectionDraftSnapshot,
} from "../lib/collectionSlotDraft";
import { padOrTrimCollectionValues } from "../lib/collectionDataSource";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import {
  isStandardScalarValueType,
  standardScalarValueTypeLabel,
} from "../lib/standardScalarSlotTypes";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import { PayloadSlotMetaFields } from "./PayloadSlotMetaFields";
import { removeExternalVariableSlot } from "../lib/variableBindingEdit";
import {
  buildPreviewPayload,
  commitPayloadSlotDraft,
  getEffectiveSlotValue,
  isPayloadSlotDraftDirty,
  seedCollectionSlotDraft,
  toCollectionItems,
  type PayloadSlotDraft,
  type PayloadSlotDraftMap,
} from "../lib/payloadSlotDraft";
import { Field } from "./ui/Field";
import { ColorField } from "./ui/ColorField";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopTextArea } from "./ui/ShopFormControls";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  slotDrafts?: PayloadSlotDraftMap;
  onSlotDraftChange?: (slotId: string, draft: PayloadSlotDraft | null) => void;
  onCommitSlot?: (slotId: string) => void;
  onPayloadChange: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onSlotIdChange?: (slotId: string) => void;
  selectedSlotId?: string | null;
  /** 创建列表变量后自动打开数据源配置弹窗 */
  autoOpenDataSourceSlotId?: string | null;
  onAutoOpenDataSourceHandled?: () => void;
  /** embedded：嵌在配置 Inspector 内，外层用 div，避免 aside 套 aside */
  variant?: "panel" | "embedded";
};

function formatDefaultPreview(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return String(v);
  }
}

function slotValueTypeHint(valueType: string): string {
  if (valueType === "collection") return payloadSlotValueTypeLabel(valueType);
  switch (valueType) {
    case "string":
      return "纯文本";
    case "url":
      return "链接 URL";
    case "image":
      return "图片 URL";
    case "color":
      return "颜色（CSS）";
    case "number":
      return "数值（JSON 数字）";
    default:
      return valueType;
  }
}


function SlotEditor({
  slot,
  payload,
  previewPayload,
  slotDrafts,
  onSlotDraftChange,
  template,
  onPatch,
  onTemplatePayloadChange,
  onSlotIdChange,
  dataSourceModalOpen,
  onDataSourceModalOpenChange,
}: {
  slot: ExternalVariableSlotInfo;
  payload: EmailPayload;
  previewPayload: EmailPayload;
  slotDrafts: PayloadSlotDraftMap;
  onSlotDraftChange?: (slotId: string, draft: PayloadSlotDraft | null) => void;
  template: EmailTemplate;
  onPatch: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onSlotIdChange?: (slotId: string) => void;
  dataSourceModalOpen: boolean;
  onDataSourceModalOpenChange: (open: boolean) => void;
}) {
  const slotDraft = slotDrafts[slot.slotId];
  const raw = getEffectiveSlotValue(payload, slotDrafts, slot.slotId);
  const detached = payload.detachedVariableSlotIds?.includes(slot.slotId) ?? false;

  const patchSlotDraft = (partial: PayloadSlotDraft) => {
    if (!onSlotDraftChange) {
      onPatch(
        commitPayloadSlotDraft(payload, slot.slotId, {
          ...slotDraft,
          ...partial,
        })
      );
      return;
    }
    onSlotDraftChange(slot.slotId, { ...(slotDraft ?? {}), ...partial });
  };
  const bindingHint = isStandardScalarValueType(slot.valueType)
    ? `类型 ${standardScalarValueTypeLabel(slot.valueType)} · 绑定 ${slot.bindings.length} 处`
    : `类型 ${slot.valueType}（${slotValueTypeHint(slot.valueType)}） · 绑定 ${slot.bindings.length} 处`;
  const savedValueHint =
    slot.defaultValue !== undefined
      ? `已保存取值：${formatDefaultPreview(slot.defaultValue)}`
      : undefined;

  const hintParts = [bindingHint, savedValueHint].filter(Boolean).join(" · ");
  const scalarEmptyPlaceholder = detached
    ? "留空则沿用模板中的字面量"
    : "留空则不合并外部取值到预览";

  const clearSlot = () => {
    patchSlotDraft({ value: undefined });
  };

  const setSlotValue = (nextVal: unknown | undefined) => {
    if (nextVal === undefined) {
      patchSlotDraft({ value: undefined });
      return;
    }
    if (typeof nextVal === "string" && nextVal.trim() === "") {
      patchSlotDraft({ value: undefined });
      return;
    }
    patchSlotDraft({ value: nextVal });
  };

  const assignmentHeaderExtra =
    raw !== undefined && raw !== null && raw !== "" ? (
      <ShopSecondaryButton htmlType="button" onClick={clearSlot} title="清除表单中的赋值；保存变量后才会写入 payload.json">
        清除赋值
      </ShopSecondaryButton>
    ) : null;

  const detachedBanner = detached ? (
    <p className="inspector__muted payload-inspector__detached-hint">
      该槽位已在画布上「解除跟随」可变内容：下方赋值不会合并到预览；请切换到「底层 Block」编辑字面量，或使用 Inspector
      中的「恢复跟随」。
    </p>
  ) : null;

  const valueLabel = "赋值";

  const metaProps = {
    slot,
    template,
    payload,
    onPayloadChange: onPatch,
    onTemplatePayloadChange,
    onSlotIdChange,
  };
  if (slot.valueType === "collection") {
    const itemFields = resolveEffectiveCollectionItemFields(slot, slotDraft);
    const collectionDraft =
      slotDraft ?? seedCollectionSlotDraft(payload, slot.slotId, itemFields);

    const ensureDraft = (): PayloadSlotDraft => {
      if (slotDraft) return slotDraft;
      const seeded = seedCollectionSlotDraft(payload, slot.slotId, itemFields);
      onSlotDraftChange?.(slot.slotId, seeded);
      return seeded;
    };

    const handleItemFieldsChange = (nextFields: NonNullable<typeof itemFields>) => {
      const current = ensureDraft();
      const snap = draftToCollectionSnapshot(
        current,
        nextFields,
        payload.values[slot.slotId]
      );
      const items = padOrTrimCollectionValues(
        toCollectionItems(current.value ?? payload.values[slot.slotId]),
        snap.fixedLength,
        nextFields
      );
      onSlotDraftChange?.(slot.slotId, {
        ...current,
        slotDefPatch: { ...(current.slotDefPatch ?? {}), itemFields: nextFields },
        value: items,
      });
    };

    const handleFixedLengthChange = (length: number) => {
      const current = ensureDraft();
      const snap = draftToCollectionSnapshot(
        current,
        itemFields,
        payload.values[slot.slotId]
      );
      const items = padOrTrimCollectionValues(
        toCollectionItems(current.value ?? payload.values[slot.slotId]),
        length,
        itemFields
      );
      onSlotDraftChange?.(
        slot.slotId,
        patchCollectionDraftSnapshot(current, { ...snap, fixedLength: length, items })
      );
    };

    return (
      <>
        <PayloadSlotMetaFields {...metaProps} />
        {detachedBanner}
        <CollectionVariablePanel
          slot={slot}
          committedPayload={payload}
          previewPayload={previewPayload}
          draft={slotDraft}
          detached={detached}
          ensureDraft={ensureDraft}
          onDraftChange={(next) => onSlotDraftChange?.(slot.slotId, next)}
          onItemFieldsChange={handleItemFieldsChange}
          onFixedLengthChange={handleFixedLengthChange}
          onOpenDataSourceModal={() => {
            ensureDraft();
            onDataSourceModalOpenChange(true);
          }}
        />
        <CollectionDataSourceBindModal
          visible={dataSourceModalOpen}
          slot={slot}
          committedPayload={payload}
          draft={collectionDraft}
          onDraftChange={(next) => onSlotDraftChange?.(slot.slotId, next)}
          onClose={() => onDataSourceModalOpenChange(false)}
          onApply={() => onDataSourceModalOpenChange(false)}
        />
      </>
    );
  }

  const metaSection = <PayloadSlotMetaFields {...metaProps} />;

  if (slot.valueType === "color") {
    const str =
      typeof raw === "string"
        ? raw
        : typeof slot.defaultValue === "string"
          ? slot.defaultValue
          : "#000000";
    return (
      <>
        {metaSection}
        {detachedBanner}
        <ColorField
          label={valueLabel}
          hint={hintParts}
          headerExtra={assignmentHeaderExtra}
          value={str}
          onChange={(next) => setSlotValue(next)}
          disabled={detached}
        />
      </>
    );
  }

  if (slot.valueType === "number") {
    const display =
      raw === undefined || raw === null
        ? ""
        : typeof raw === "number" && Number.isFinite(raw)
          ? String(raw)
          : typeof raw === "string"
            ? raw
            : typeof slot.defaultValue === "number" && Number.isFinite(slot.defaultValue)
              ? String(slot.defaultValue)
              : "";
    return (
      <>
        {metaSection}
        {detachedBanner}
        <Field label={valueLabel} hint={hintParts} headerExtra={assignmentHeaderExtra}>
          <ShopInput
            type="number"
            value={display}
            placeholder={scalarEmptyPlaceholder}
            disabled={detached}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v === "") setSlotValue(undefined);
              else {
                const n = Number(v);
                if (Number.isFinite(n)) setSlotValue(n);
              }
            }}
          />
        </Field>
      </>
    );
  }

  const stringVal = raw === undefined || raw === null ? "" : String(raw);

  if (slot.valueType === "string") {
    return (
      <>
        {metaSection}
        {detachedBanner}
        <Field label={valueLabel} hint={hintParts} headerExtra={assignmentHeaderExtra}>
          <ShopTextArea
            value={stringVal}
            placeholder={scalarEmptyPlaceholder}
            rows={4}
            disabled={detached}
            onChange={(e) => {
              const v = e.target.value;
              setSlotValue(v === "" ? undefined : v);
            }}
          />
        </Field>
      </>
    );
  }

  const placeholder =
    slot.valueType === "url"
      ? "https://…"
      : slot.valueType === "image"
        ? "图片 URL（https://…）"
        : "输入 URL";

  return (
    <>
      {metaSection}
      {detachedBanner}
      <Field label={valueLabel} hint={hintParts} headerExtra={assignmentHeaderExtra}>
        <ShopInput
          value={stringVal}
          placeholder={placeholder}
          disabled={detached}
          onChange={(e) => {
            const v = e.target.value;
            setSlotValue(v === "" ? undefined : v);
          }}
        />
      </Field>
    </>
  );
}

export function PayloadInspector({
  template,
  payload,
  slotDrafts = {},
  onSlotDraftChange,
  onCommitSlot,
  onPayloadChange,
  onTemplatePayloadChange,
  onSlotIdChange,
  selectedSlotId = null,
  autoOpenDataSourceSlotId = null,
  onAutoOpenDataSourceHandled,
  variant = "panel",
}: Props) {
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const previewPayload = useMemo(
    () => buildPreviewPayload(payload, slotDrafts),
    [payload, slotDrafts]
  );

  const slots = useMemo(
    () => collectPayloadVariableSlots(template, payload),
    [template, payload]
  );
  const visibleSlots = useMemo(() => {
    if (variant === "embedded") return slots;
    const activeSlotId = selectedSlotId ?? slots[0]?.slotId;
    return slots.filter((slot) => slot.slotId === activeSlotId);
  }, [selectedSlotId, slots, variant]);

  const title = variant === "embedded" ? "整封邮件可替换变量" : "变量详情";
  const activeSlot = variant === "panel" ? (visibleSlots[0] ?? null) : null;
  const activeSlotDraft = activeSlot ? slotDrafts[activeSlot.slotId] : undefined;
  const activeSlotHasUnsavedEdits =
    activeSlot && activeSlotDraft
      ? isPayloadSlotDraftDirty(payload, activeSlot.slotId, activeSlotDraft)
      : false;

  useEffect(() => {
    if (!activeSlot || !onSlotDraftChange) return;
    if (activeSlot.valueType !== "collection") return;
    if (slotDrafts[activeSlot.slotId]) return;
    const fields = resolveEffectiveCollectionItemFields(activeSlot, slotDrafts[activeSlot.slotId]);
    onSlotDraftChange(
      activeSlot.slotId,
      seedCollectionSlotDraft(payload, activeSlot.slotId, fields)
    );
  }, [activeSlot, onSlotDraftChange, payload, slotDrafts]);

  useEffect(() => {
    if (!autoOpenDataSourceSlotId || !activeSlot) return;
    if (activeSlot.slotId !== autoOpenDataSourceSlotId) return;
    if (activeSlot.valueType !== "collection") return;
    setDataSourceModalOpen(true);
    onAutoOpenDataSourceHandled?.();
  }, [activeSlot, autoOpenDataSourceSlotId, onAutoOpenDataSourceHandled]);

  const handleCommitActiveSlot = () => {
    if (!activeSlot || !onCommitSlot) return;
    onCommitSlot(activeSlot.slotId);
  };

  const handleDeleteActiveSlot = () => {
    if (!activeSlot) return;
    const ok = window.confirm(
      `确定删除变量「${activeSlot.label ?? activeSlot.slotId}」吗？这会同步移除模板中的相关变量绑定，并从 payload 中删除该变量目录与赋值。`
    );
    if (!ok) return;
    const next = removeExternalVariableSlot(template, payload, activeSlot.slotId);
    onSlotDraftChange?.(activeSlot.slotId, null);
    if (onTemplatePayloadChange) {
      onTemplatePayloadChange(next);
    } else {
      onPayloadChange(next.payload);
    }
    const nextId = slots.find((s) => s.slotId !== activeSlot.slotId)?.slotId;
    if (nextId) onSlotIdChange?.(nextId);
  };

  const intro =
    variant === "embedded" ? (
      <p className="inspector__muted payload-inspector__intro">
        以下为整封邮件全部可外部赋值变量，与顶部「变量赋值」共用当前 <code>payload</code>。
      </p>
    ) : (
      <p className="inspector__muted payload-inspector__intro">
        列表变量：顶部固定变量名称与标识；其下为数据源、列表长度、行字段与只读预览。有实质修改时请点「保存变量」，顶栏「保存」写入 payload.json。
      </p>
    );

  const emptyHint = (
    <p className="inspector__muted">
      当前模板没有可在赋值里替换的字段。请在底层 Block 的绑定中声明可外部赋值变量。
    </p>
  );

  const scrollBody = (
    <div className="theme-inspector__scroll">
      {intro}

      {visibleSlots.length === 0 ? (
        emptyHint
      ) : (
        visibleSlots.map((slot) => (
          <section key={slot.slotId} className="theme-inspector__block payload-inspector__slot-block">
            <SlotEditor
              slot={slot}
              payload={payload}
              previewPayload={previewPayload}
              slotDrafts={slotDrafts}
              onSlotDraftChange={onSlotDraftChange}
              template={template}
              onPatch={onPayloadChange}
              onTemplatePayloadChange={onTemplatePayloadChange}
              onSlotIdChange={onSlotIdChange}
              dataSourceModalOpen={dataSourceModalOpen}
              onDataSourceModalOpenChange={setDataSourceModalOpen}
            />
          </section>
        ))
      )}
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="payload-inspector payload-inspector--embedded theme-inspector">
        <h3 className="side-inspector__payload-title">{title}</h3>
        {scrollBody}
      </div>
    );
  }

  return (
    <aside className="side-inspector theme-inspector payload-inspector">
      <div className="side-inspector__headrow payload-inspector__headrow">
        <h2 className="side-panel__title">{title}</h2>
        {activeSlot ? (
          <div className="payload-inspector__head-actions">
            {activeSlotHasUnsavedEdits && onCommitSlot ? (
              <ShopPrimaryButton
                htmlType="button"
                onClick={handleCommitActiveSlot}
                title="将本变量修改写入当前邮件内存（仍须顶栏「保存」才写入 payload.json）"
              >
                保存变量
              </ShopPrimaryButton>
            ) : null}
            <ShopSecondaryButton
              htmlType="button"
              onClick={handleDeleteActiveSlot}
              title="删除变量目录、赋值及模板中的相关绑定"
            >
              删除变量
            </ShopSecondaryButton>
          </div>
        ) : null}
      </div>
      {scrollBody}
    </aside>
  );
}
