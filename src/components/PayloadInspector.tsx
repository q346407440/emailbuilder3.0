import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EmailPayload, EmailTemplate } from "../types/email";
import {
  collectPayloadVariableSlots,
  type ExternalVariableSlotInfo,
} from "../lib/payloadSlots";
import { CollectionDataSourceBindModal } from "./CollectionDataSourceBindModal";
import { collectionSlotUsesJsonPasteDataSource } from "../lib/sceneCollectionPresetSlot";
import { CollectionVariablePanel } from "./CollectionVariablePanel";
import { ObjectVariablePanel } from "./ObjectVariablePanel";
import {
  draftToCollectionSnapshot,
  patchCollectionDraftSnapshot,
} from "../lib/collectionSlotDraft";
import { padOrTrimCollectionValues } from "../lib/collectionDataSource";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import {
  isStandardScalarValueType,
  standardScalarValueTypeLabel,
} from "../payload-contract/standard-scalar-types";
import { payloadSlotValueTypeLabel } from "../payload-contract/value-type-labels";
import {
  PayloadSlotMetaAttributesSection,
  PayloadSlotMetaFields,
  usePayloadSlotMetaFields,
} from "./PayloadSlotMetaFields";
import { useConfirmDialog } from "./ui/ConfirmDialogProvider";
import { removeExternalVariableSlot } from "../lib/variableBindingEdit";
import {
  buildPreviewPayload,
  getEffectiveSlotValue,
  seedCollectionSlotDraft,
  toCollectionItems,
  type PayloadSlotDraft,
  type PayloadSlotDraftMap,
} from "../lib/payloadSlotDraft";
import { Field } from "./ui/Field";
import { ColorField } from "./ui/ColorField";
import { ShopInput, ShopSelect, ShopTextArea } from "./ui/ShopFormControls";
import { UrlAssetUploadInput } from "./ui/UrlAssetUploadInput";
import { isPayloadSlotEditorReadonly } from "../lib/payloadSlotEditorReadonly";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  slotDrafts?: PayloadSlotDraftMap;
  onSlotDraftChange?: (slotId: string, draft: PayloadSlotDraft | null) => void;
  onPayloadChange: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onVariableDeleted?: (next: {
    template: EmailTemplate;
    payload: EmailPayload;
    slotId: string;
  }) => void | Promise<void>;
  onSlotIdChange?: (slotId: string | null) => void;
  selectedSlotId?: string | null;
  /** embedded：嵌在配置 Inspector 内，外层用 div，避免 aside 套 aside */
  variant?: "panel" | "embedded";
  slotValidationError?: string;
  slotValidationWarning?: string;
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
  if (valueType === "collection" || valueType === "object") return payloadSlotValueTypeLabel(valueType);
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
    case "boolean":
      return "真 / 假（二选一）";
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
  dataSourceModalReimport,
  onDataSourceModalReimportChange,
  layout = "embedded",
  valuesReadonly = false,
}: {
  slot: ExternalVariableSlotInfo;
  payload: EmailPayload;
  previewPayload: EmailPayload;
  slotDrafts: PayloadSlotDraftMap;
  onSlotDraftChange?: (slotId: string, draft: PayloadSlotDraft | null) => void;
  template: EmailTemplate;
  onPatch: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onSlotIdChange?: (slotId: string | null) => void;
  dataSourceModalOpen: boolean;
  onDataSourceModalOpenChange: (open: boolean) => void;
  dataSourceModalReimport: boolean;
  onDataSourceModalReimportChange: (reimport: boolean) => void;
  layout?: "panel" | "embedded";
  valuesReadonly?: boolean;
}) {
  const panelLayout = layout === "panel";
  const slotDraft = slotDrafts[slot.slotId];
  const raw = getEffectiveSlotValue(payload, slotDrafts, slot.slotId);
  const detached = payload.detachedVariableSlotIds?.includes(slot.slotId) ?? false;
  const fieldDisabled = detached || valuesReadonly;

  const patchSlotDraft = (partial: PayloadSlotDraft) => {
    if (valuesReadonly) return;
    if (!onSlotDraftChange) return;
    onSlotDraftChange(slot.slotId, { ...(slotDraft ?? {}), ...partial });
  };
  const bindingHint = isStandardScalarValueType(slot.valueType)
    ? `类型 ${standardScalarValueTypeLabel(slot.valueType)} · 绑定 ${slot.bindings.length} 处`
    : `类型 ${slot.valueType}（${slotValueTypeHint(slot.valueType)}） · 绑定 ${slot.bindings.length} 处`;
  const savedValueHint =
    slot.defaultValue !== undefined
      ? `已保存取值：${formatDefaultPreview(slot.defaultValue)}`
      : undefined;

  const hintParts = panelLayout
    ? undefined
    : [bindingHint, savedValueHint].filter(Boolean).join(" · ");
  const scalarEmptyPlaceholder = detached
    ? "留空则沿用模板中的固定内容"
    : "留空则不合并外部取值到预览";

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

  const assignmentHeaderExtra = null;

  const detachedBanner = detached ? (
    <p className="inspector__muted payload-inspector__detached-hint">
      当前变量已解除跟随，修改赋值不会影响预览。
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
    labelReadonly: valuesReadonly,
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

    const renderCollectionPanel = (panelSection: "all" | "config" | "preview" = "all") => (
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
        layout={layout}
        panelSection={panelSection}
        valuesReadonly={valuesReadonly}
      />
    );

    return (
      <>
        {panelLayout ? null : <PayloadSlotMetaFields {...metaProps} />}
        {detachedBanner}
        {panelLayout ? (
          <>
            <div className="payload-inspector__group">
              <h3 className="inspector__subtitle">列表配置</h3>
              <section className="inspector__section payload-inspector__collection-config">
                {renderCollectionPanel("config")}
              </section>
            </div>
            <div className="payload-inspector__group">
              <h3 className="inspector__subtitle">数据预览</h3>
              <section className="inspector__section payload-inspector__collection-preview">
                {renderCollectionPanel("preview")}
              </section>
            </div>
          </>
        ) : (
          renderCollectionPanel()
        )}
        <CollectionDataSourceBindModal
          visible={
            dataSourceModalOpen &&
            collectionSlotUsesJsonPasteDataSource(payload.slots[slot.slotId])
          }
          slot={slot}
          committedPayload={payload}
          draft={collectionDraft}
          reimportMode={dataSourceModalReimport}
          onDraftChange={(next) => onSlotDraftChange?.(slot.slotId, next)}
          onClose={() => {
            onDataSourceModalReimportChange(false);
            onDataSourceModalOpenChange(false);
          }}
          onApply={() => {
            onDataSourceModalReimportChange(false);
            onDataSourceModalOpenChange(false);
          }}
        />
      </>
    );
  }

  if (slot.valueType === "object") {
    const renderObjectPanel = (panelSection: "all" | "config" | "preview" = "all") => (
      <ObjectVariablePanel
        slot={slot}
        previewPayload={previewPayload}
        layout={layout}
        panelSection={panelSection}
      />
    );

    return (
      <>
        {panelLayout ? null : <PayloadSlotMetaFields {...metaProps} />}
        {detachedBanner}
        {panelLayout ? (
          <>
            <div className="payload-inspector__group">
              <h3 className="inspector__subtitle">对象配置</h3>
              <section className="inspector__section payload-inspector__collection-config">
                {renderObjectPanel("config")}
              </section>
            </div>
            <div className="payload-inspector__group">
              <h3 className="inspector__subtitle">数据预览</h3>
              <section className="inspector__section payload-inspector__collection-preview">
                {renderObjectPanel("preview")}
              </section>
            </div>
          </>
        ) : (
          renderObjectPanel()
        )}
      </>
    );
  }

  const metaSection = panelLayout ? null : <PayloadSlotMetaFields {...metaProps} />;

  const wrapAssignmentSection = (body: ReactNode) =>
    panelLayout ? (
      <div className="payload-inspector__group">
        <h3 className="inspector__subtitle">赋值</h3>
        <section className="inspector__section payload-inspector__assignment">{body}</section>
      </div>
    ) : (
      body
    );

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
        {wrapAssignmentSection(
          <ColorField
            label={valueLabel}
            {...(hintParts ? { hint: hintParts } : {})}
            headerExtra={assignmentHeaderExtra}
            value={str}
            onChange={(next) => setSlotValue(next)}
            disabled={fieldDisabled}
          />
        )}
      </>
    );
  }

  if (slot.valueType === "boolean") {
    const boolValue =
      typeof raw === "boolean"
        ? raw
        : raw === "true"
          ? true
          : raw === "false"
            ? false
            : undefined;
    const selectValue = boolValue === true ? "true" : boolValue === false ? "false" : "";
    return (
      <>
        {metaSection}
        {detachedBanner}
        {wrapAssignmentSection(
          <Field
            label={valueLabel}
            {...(hintParts ? { hint: hintParts } : {})}
            headerExtra={assignmentHeaderExtra}
          >
            <ShopSelect
              value={selectValue}
              disabled={fieldDisabled}
              placeholder="选择真或假"
              onChange={(next) => {
                if (next === "" || next === undefined || next === null) {
                  setSlotValue(undefined);
                  return;
                }
                setSlotValue(next === "true");
              }}
            >
              <ShopSelect.Option value="">未设置</ShopSelect.Option>
              <ShopSelect.Option value="true">真</ShopSelect.Option>
              <ShopSelect.Option value="false">假</ShopSelect.Option>
            </ShopSelect>
          </Field>
        )}
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
        {wrapAssignmentSection(
          <Field
            label={valueLabel}
            {...(hintParts ? { hint: hintParts } : {})}
            headerExtra={assignmentHeaderExtra}
          >
            <ShopInput
              type="number"
              value={display}
              placeholder={scalarEmptyPlaceholder}
              disabled={fieldDisabled}
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
        )}
      </>
    );
  }

  const stringVal = raw === undefined || raw === null ? "" : String(raw);

  if (slot.valueType === "string") {
    return (
      <>
        {metaSection}
        {detachedBanner}
        {wrapAssignmentSection(
          <Field
            label={valueLabel}
            {...(hintParts ? { hint: hintParts } : {})}
            headerExtra={assignmentHeaderExtra}
          >
            <ShopTextArea
              value={stringVal}
              placeholder={scalarEmptyPlaceholder}
              rows={4}
              disabled={fieldDisabled}
              onChange={(e) => {
                const v = e.target.value;
                setSlotValue(v === "" ? undefined : v);
              }}
            />
          </Field>
        )}
      </>
    );
  }

  const placeholder =
    slot.valueType === "url"
      ? "https://…"
      : slot.valueType === "image"
        ? "图片 URL（https://…）"
        : "输入 URL";

  const uploadKind = slot.valueType === "image" ? ("image" as const) : undefined;

  return (
    <>
      {metaSection}
      {detachedBanner}
      {wrapAssignmentSection(
        <Field
          label={valueLabel}
          {...(hintParts ? { hint: hintParts } : {})}
          headerExtra={assignmentHeaderExtra}
        >
          {uploadKind ? (
            <UrlAssetUploadInput
              uploadKind={uploadKind}
              value={stringVal}
              placeholder={placeholder}
              disabled={fieldDisabled}
              onChange={(v) => setSlotValue(v === "" ? undefined : v)}
            />
          ) : (
            <ShopInput
              value={stringVal}
              placeholder={placeholder}
              disabled={fieldDisabled}
              onChange={(e) => {
                const v = e.target.value;
                setSlotValue(v === "" ? undefined : v);
              }}
            />
          )}
        </Field>
      )}
    </>
  );
}

function PayloadInspectorImpl({
  template,
  payload,
  slotDrafts = {},
  onSlotDraftChange,
  onPayloadChange,
  onTemplatePayloadChange,
  onVariableDeleted,
  onSlotIdChange,
  selectedSlotId = null,
  variant = "panel",
  slotValidationError,
  slotValidationWarning,
}: Props) {
  const { confirm } = useConfirmDialog();
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [dataSourceModalReimport, setDataSourceModalReimport] = useState(false);
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

  const handleDeleteActiveSlot = async () => {
    if (!activeSlot) return;
    const slotTitle = activeSlot.label ?? activeSlot.slotId;
    const ok = await confirm({
      title: "删除变量",
      message: (
        <p className="confirm-dialog__message">确定删除变量「{slotTitle}」吗？删除后不可恢复。</p>
      ),
      confirmLabel: "删除",
      danger: true,
    });
    if (!ok) return;
    const next = removeExternalVariableSlot(template, payload, activeSlot.slotId);
    try {
      if (onVariableDeleted) {
        await onVariableDeleted({
          template: next.template,
          payload: next.payload,
          slotId: activeSlot.slotId,
        });
      } else if (onTemplatePayloadChange) {
        onTemplatePayloadChange(next);
      } else {
        onPayloadChange(next.payload);
      }
    } catch {
      return;
    }
    onSlotDraftChange?.(activeSlot.slotId, null);
    const nextId = slots.find((s) => s.slotId !== activeSlot.slotId)?.slotId ?? null;
    onSlotIdChange?.(nextId);
  };

  const embeddedIntro = (
    <p className="inspector__muted payload-inspector__intro">
      以下为整封邮件全部可外部赋值变量，与左侧「变量赋值」列表共用同一套数据。
    </p>
  );

  const emptyHint =
    variant === "panel" ? (
      <p className="inspector__muted">请先在左侧选择或新建变量。</p>
    ) : (
      <p className="inspector__muted">
        当前模板没有可外部赋值的变量。请在区块绑定中声明变量，或通过左侧列表新建。
      </p>
    );

  if (variant === "embedded") {
    return (
      <div className="payload-inspector payload-inspector--embedded theme-inspector">
        <h3 className="side-inspector__payload-title">{title}</h3>
        <div className="theme-inspector__scroll">
          {embeddedIntro}
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
                  dataSourceModalReimport={dataSourceModalReimport}
                  onDataSourceModalReimportChange={setDataSourceModalReimport}
                  layout="embedded"
                  valuesReadonly={isPayloadSlotEditorReadonly(payload, slot.slotId)}
                />
              </section>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!activeSlot) {
    return (
      <aside className="inspector inspector--payload payload-inspector" aria-label="变量详情">
        <header className="payload-inspector__header">
          <div className="side-inspector__headrow payload-inspector__headrow">
            <h2 className="side-panel__title">变量详情</h2>
          </div>
        </header>
        <div className="payload-inspector__scroll">{emptyHint}</div>
      </aside>
    );
  }

  return (
    <PayloadInspectorPanelActive
      activeSlot={activeSlot}
      title={title}
      slotValidationError={slotValidationError}
      slotValidationWarning={slotValidationWarning}
      template={template}
      payload={payload}
      previewPayload={previewPayload}
      slotDrafts={slotDrafts}
      onSlotDraftChange={onSlotDraftChange}
      onPayloadChange={onPayloadChange}
      onTemplatePayloadChange={onTemplatePayloadChange}
      onSlotIdChange={onSlotIdChange}
      dataSourceModalOpen={dataSourceModalOpen}
      onDataSourceModalOpenChange={setDataSourceModalOpen}
      dataSourceModalReimport={dataSourceModalReimport}
      onDataSourceModalReimportChange={setDataSourceModalReimport}
      onDeleteActiveSlot={handleDeleteActiveSlot}
    />
  );
}

type PanelActiveProps = {
  activeSlot: ExternalVariableSlotInfo;
  title: string;
  slotValidationError?: string;
  slotValidationWarning?: string;
  template: EmailTemplate;
  payload: EmailPayload;
  previewPayload: EmailPayload;
  slotDrafts: PayloadSlotDraftMap;
  onSlotDraftChange?: (slotId: string, draft: PayloadSlotDraft | null) => void;
  onPayloadChange: (next: EmailPayload) => void;
  onTemplatePayloadChange?: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onSlotIdChange?: (slotId: string | null) => void;
  dataSourceModalOpen: boolean;
  onDataSourceModalOpenChange: (open: boolean) => void;
  dataSourceModalReimport: boolean;
  onDataSourceModalReimportChange: (reimport: boolean) => void;
  onDeleteActiveSlot: () => void;
};

function PayloadInspectorPanelActive({
  activeSlot,
  title,
  slotValidationError,
  slotValidationWarning,
  template,
  payload,
  previewPayload,
  slotDrafts,
  onSlotDraftChange,
  onPayloadChange,
  onTemplatePayloadChange,
  onSlotIdChange,
  dataSourceModalOpen,
  onDataSourceModalOpenChange,
  dataSourceModalReimport,
  onDataSourceModalReimportChange,
  onDeleteActiveSlot,
}: PanelActiveProps) {
  const valuesReadonly = isPayloadSlotEditorReadonly(payload, activeSlot.slotId);
  const meta = usePayloadSlotMetaFields({
    slot: activeSlot,
    template,
    payload,
    onPayloadChange,
    onTemplatePayloadChange,
    onSlotIdChange,
    labelReadonly: valuesReadonly,
  });

  return (
    <aside className="inspector inspector--payload payload-inspector" aria-label="变量详情">
      <header className="payload-inspector__header">
        {slotValidationError ? (
          <p className="inspector-field__message inspector-field__message--error" role="alert">
            {slotValidationError}
          </p>
        ) : slotValidationWarning ? (
          <p className="inspector-field__message inspector-field__message--warn">{slotValidationWarning}</p>
        ) : null}
        <div className="side-inspector__headrow payload-inspector__headrow">
          <ShopInput
            value={activeSlot.label ?? activeSlot.slotId}
            className="inspector__title-input"
            aria-label="变量名称"
            placeholder={activeSlot.slotId || title}
            disabled
          />
          <div className="payload-inspector__head-actions">
            <button
              type="button"
              className="resource-text-action resource-text-action--danger"
              onClick={() => void onDeleteActiveSlot()}
              title="删除变量及其绑定"
            >
              删除
            </button>
          </div>
        </div>
      </header>
      <div className="inspector__token-scroll payload-inspector__scroll">
        <div className="payload-inspector__group">
          <h3 className="inspector__subtitle">变量属性</h3>
          <PayloadSlotMetaAttributesSection meta={meta} variant="production" />
        </div>
        <SlotEditor
          slot={activeSlot}
          payload={payload}
          previewPayload={previewPayload}
          slotDrafts={slotDrafts}
          onSlotDraftChange={onSlotDraftChange}
          template={template}
          onPatch={onPayloadChange}
          onTemplatePayloadChange={onTemplatePayloadChange}
          onSlotIdChange={onSlotIdChange}
          dataSourceModalOpen={dataSourceModalOpen}
          onDataSourceModalOpenChange={onDataSourceModalOpenChange}
          dataSourceModalReimport={dataSourceModalReimport}
          onDataSourceModalReimportChange={onDataSourceModalReimportChange}
          layout="panel"
          valuesReadonly={valuesReadonly}
        />
      </div>
    </aside>
  );
}

export const PayloadInspector = memo(PayloadInspectorImpl);
