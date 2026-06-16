import { useEffect, useMemo, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { isSceneCollectionPresetManagedSlot } from "../lib/sceneCollectionPresetSlot";
import {
  COLLECTION_FIXED_LENGTH_MAX,
  COLLECTION_FIXED_LENGTH_MIN,
  padOrTrimCollectionValues,
  resolveCollectionFixedLength,
} from "../lib/collectionDataSource";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import { toCollectionItems, type PayloadSlotDraft } from "../lib/payloadSlotDraft";
import { CollectionFixedLengthField } from "./CollectionFixedLengthField";
import { CollectionItemFieldsModal } from "./CollectionItemFieldsModal";
import { CollectionItemPreview } from "./collectionItemPreview";
import type { ButtonHTMLAttributes } from "react";
import { Field } from "./ui/Field";
import { ShopSecondaryButton } from "./ui/ShopFormControls";
import {
  normalizeItemVisibility,
  setCollectionItemVisibilityAt,
} from "../lib/collectionItemVisibility";
import { isBuiltinStructureSlot } from "../lib/builtinStructureSlot";
import { collectionFixedLengthEditability } from "../lib/collectionFixedLength";

type Props = {
  slot: ExternalVariableSlotInfo;
  committedPayload: EmailPayload;
  previewPayload: EmailPayload;
  draft?: PayloadSlotDraft;
  detached: boolean;
  ensureDraft: () => PayloadSlotDraft;
  onDraftChange: (draft: PayloadSlotDraft) => void;
  onItemFieldsChange: (itemFields: NonNullable<ExternalVariableSlotInfo["itemFields"]>) => void;
  onFixedLengthChange: (length: number) => void;
  layout?: "panel" | "embedded";
  panelSection?: "all" | "config" | "preview";
  valuesReadonly?: boolean;
};

function InspectorTextAction({
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={["resource-text-action", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

function summarizeItemFields(itemFields: NonNullable<ExternalVariableSlotInfo["itemFields"]>): string {
  if (itemFields.length === 0) return "尚未配置行字段";
  const names = itemFields
    .map((f) => f.label?.trim() || f.key?.trim())
    .filter(Boolean)
    .slice(0, 4);
  const head = names.length > 0 ? names.join("、") : "未命名字段";
  if (itemFields.length <= 4 && names.length === itemFields.length) {
    return `共 ${itemFields.length} 个：${head}`;
  }
  return `共 ${itemFields.length} 个${names.length > 0 ? `：${head}…` : ""}`;
}

export function CollectionVariablePanel({
  slot,
  committedPayload,
  previewPayload,
  draft,
  detached,
  ensureDraft,
  onDraftChange,
  onItemFieldsChange,
  onFixedLengthChange,
  layout = "embedded",
  panelSection = "all",
  valuesReadonly = false,
}: Props) {
  const panelLayout = layout === "panel";
  const showConfig = panelSection === "all" || panelSection === "config";
  const showPreview = panelSection === "all" || panelSection === "preview";
  const [itemFieldsModalOpen, setItemFieldsModalOpen] = useState(false);
  const itemFields = resolveEffectiveCollectionItemFields(slot, draft);
  const entry = committedPayload.slots[slot.slotId];
  const effectiveEntry = draft?.slotDefPatch ? { ...entry, ...draft.slotDefPatch } : entry;
  const scenePresetManaged = isSceneCollectionPresetManagedSlot(effectiveEntry);
  const builtinManaged = isBuiltinStructureSlot(effectiveEntry);
  const itemFieldsReadonly = detached || scenePresetManaged || builtinManaged;
  const fixedLength = resolveCollectionFixedLength(
    effectiveEntry?.minItems,
    effectiveEntry?.maxItems
  );
  const fixedLengthEditability = collectionFixedLengthEditability(committedPayload, slot.slotId);

  const previewValues = previewPayload.values[slot.slotId];
  const readonlyMockPreview = builtinManaged || scenePresetManaged || valuesReadonly;
  const manualFormReady = itemFields.length > 0 && !detached && !readonlyMockPreview;
  const itemFieldStructureSig = useMemo(
    () => itemFields.map((f) => `${f.key}:${f.valueType ?? ""}`).join("|"),
    [itemFields]
  );
  const effectiveItemVisibility = normalizeItemVisibility(
    fixedLength,
    draft?.slotDefPatch?.itemVisibility ?? effectiveEntry?.itemVisibility
  );

  /**
   * 手动录入：仅在行字段结构或列表长度变化时补齐空行草稿。
   * 勿把 previewValues 列入 deps，否则每次键入都会 effect 覆写，导致输入框无法编辑。
   */
  useEffect(() => {
    if (!manualFormReady) return;
    const rows = toCollectionItems(previewValues);
    const needsPad =
      rows.length !== fixedLength ||
      itemFields.some((field) => rows.some((row) => !(field.key in row)));
    if (!needsPad) return;
    const padded = padOrTrimCollectionValues(rows, fixedLength, itemFields);
    const current = ensureDraft();
    onDraftChange({ ...current, value: padded });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅结构变化时补齐，不随每次键入触发
  }, [slot.slotId, manualFormReady, fixedLength, itemFieldStructureSig]);

  const itemFieldsAction = (
    <InspectorTextAction disabled={detached} onClick={() => setItemFieldsModalOpen(true)}>
      {itemFieldsReadonly ? "查看行字段" : "配置行字段"}
    </InspectorTextAction>
  );

  return (
    <section
      className={[
        "collection-variable-panel",
        panelLayout ? "collection-variable-panel--panel" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showConfig ? (
        <CollectionFixedLengthField
          slotId={slot.slotId}
          fixedLength={fixedLength}
          disabled={detached || !fixedLengthEditability.editable}
          disabledReason={
            detached
              ? "变量已解除外部绑定，恢复绑定后可改列表长度。"
              : fixedLengthEditability.reason
          }
          hint={
            panelLayout
              ? undefined
              : `邮件版式固定展示项数，范围 ${COLLECTION_FIXED_LENGTH_MIN}–${COLLECTION_FIXED_LENGTH_MAX}。`
          }
          onCommit={onFixedLengthChange}
        />
      ) : null}

      {showConfig ? (
        <Field
          label="列表行字段"
          headerExtra={panelLayout ? itemFieldsAction : undefined}
          {...(panelLayout
            ? {}
            : {
                hint: scenePresetManaged
                  ? "内置变量字段为只读，弹窗仅可查看。"
                  : itemFieldsReadonly
                    ? "内置数据结构字段为只读，弹窗仅可查看。"
                  : "声明每一项包含哪些列（itemFields）；在弹窗中通过 Tab 切换编辑各字段，写入 payload.slots。",
              })}
        >
          <p className="inspector__muted collection-variable-panel__item-fields-summary">
            {summarizeItemFields(itemFields)}
          </p>
          {panelLayout ? null : (
            <ShopSecondaryButton
              htmlType="button"
              disabled={detached}
              onClick={() => setItemFieldsModalOpen(true)}
            >
              {itemFieldsReadonly ? "查看行字段…" : "配置行字段…"}
            </ShopSecondaryButton>
          )}
          <CollectionItemFieldsModal
            visible={itemFieldsModalOpen}
            slotId={slot.slotId}
            slotLabel={slot.label}
            itemFields={itemFields}
            disabled={itemFieldsReadonly}
            onClose={() => setItemFieldsModalOpen(false)}
            onApply={onItemFieldsChange}
          />
        </Field>
      ) : null}

      {showPreview ? (
        <Field
          label="数据预览"
          {...(panelLayout
            ? {}
            : {
                hint:
                  manualFormReady
                    ? "切换 Tab 逐条改值；子列表点「编辑」。勾选「不展示」后该行不出现在画布。"
                    : "切换查看每条数据；勾选「不展示」后该行不会出现在画布列表。",
              })}
        >
          <CollectionItemPreview
            slotId={slot.slotId}
            fields={itemFields}
            values={previewValues}
            mode={detached || !manualFormReady ? "readonly" : "editable"}
            tabCount={fixedLength}
            padToTabCount={manualFormReady}
            requireNonemptyRow={!manualFormReady}
            metaHint={
              readonlyMockPreview
                ? `共 ${fixedLength} 条 · 内置 mock 数据仅供绑定和预览，不可编辑`
                : undefined
            }
            emptyHint={
              itemFields.length === 0
                ? "请先配置列表行字段，保存后即可在此逐条填写"
                : undefined
            }
            disabled={detached}
            itemVisibility={effectiveItemVisibility}
            visibilityDisabled={detached || readonlyMockPreview}
            onItemHiddenChange={(index, hidden) => {
              if (readonlyMockPreview) return;
              const current = ensureDraft();
              const nextVisibility = setCollectionItemVisibilityAt(
                draft?.slotDefPatch?.itemVisibility ?? effectiveEntry?.itemVisibility,
                fixedLength,
                index,
                !hidden
              );
              onDraftChange({
                ...current,
                slotDefPatch: {
                  ...(current.slotDefPatch ?? {}),
                  itemVisibility: nextVisibility,
                },
              });
            }}
            onFieldChange={(rowIndex, fieldKey, value) => {
              if (readonlyMockPreview) return;
              const current = ensureDraft();
              const rows = padOrTrimCollectionValues(
                toCollectionItems(current.value ?? previewValues),
                fixedLength,
                itemFields
              );
              const next = rows.map((row, index) =>
                index === rowIndex ? { ...row, [fieldKey]: value } : row
              );
              onDraftChange({ ...current, value: next });
            }}
          />
        </Field>
      ) : null}
    </section>
  );
}
