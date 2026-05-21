import { useEffect, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import {
  COLLECTION_FIXED_LENGTH_MAX,
  COLLECTION_FIXED_LENGTH_MIN,
  clampFixedLength,
  resolveCollectionFixedLength,
} from "../lib/collectionDataSource";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import {
  applyBuiltinCollectionCatalogToDraft,
  applyBuiltinCollectionExtractToDraft,
  applyBuiltinCollectionSortToDraft,
  draftToCollectionSnapshot,
  switchCollectionDataSourceDraft,
} from "../lib/collectionSlotDraft";
import type { BuiltinCollectionCatalogId } from "../payload-contract/collection-data-source";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import { listCollectionSlotIdsForExtract } from "../lib/resolveBuiltinCollectionItems";
import { BuiltinCollectionCatalogSelect } from "./BuiltinCollectionCatalogSelect";
import { BuiltinCollectionRulesFields } from "./BuiltinCollectionRulesFields";
import { collectionDataSourceKind, type CollectionDataSourceKind, type PayloadSlotDraft } from "../lib/payloadSlotDraft";
import { CollectionItemFieldsModal } from "./CollectionItemFieldsModal";
import { CollectionLinkedPreviewTabs } from "./CollectionLinkedPreviewTabs";
import { Field } from "./ui/Field";
import { ShopInput, ShopSecondaryButton } from "./ui/ShopFormControls";

const DATA_SOURCE_KIND_OPTIONS: Array<{ kind: CollectionDataSourceKind; label: string }> = [
  { kind: "custom", label: "自定义" },
  { kind: "builtin", label: "内置" },
];

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
  onOpenDataSourceModal: () => void;
};

function CollectionDataSourceKindSegment({
  slotId,
  value,
  disabled,
  onChange,
}: {
  slotId: string;
  value: CollectionDataSourceKind;
  disabled?: boolean;
  onChange: (kind: CollectionDataSourceKind) => void;
}) {
  return (
    <div className="collection-ds-kind-segment" role="radiogroup" aria-label="数据源类型" data-slot-id={slotId}>
      {DATA_SOURCE_KIND_OPTIONS.map((opt) => {
        const selected = value === opt.kind;
        return (
          <button
            key={opt.kind}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={`collection-ds-kind-segment__item${selected ? " collection-ds-kind-segment__item--active" : ""}`}
            onClick={() => onChange(opt.kind)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
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

function countFilledItems(
  values: unknown,
  itemFields: NonNullable<ExternalVariableSlotInfo["itemFields"]>
): number {
  if (!Array.isArray(values)) return 0;
  return values.filter((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return itemFields.some((f) => {
      const v = row[f.key];
      return v !== undefined && v !== null && String(v).trim() !== "";
    });
  }).length;
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
  onOpenDataSourceModal,
}: Props) {
  const [itemFieldsModalOpen, setItemFieldsModalOpen] = useState(false);
  const itemFields = resolveEffectiveCollectionItemFields(slot, draft);
  const entry = committedPayload.slots[slot.slotId];
  const effectiveEntry = draft?.slotDefPatch ? { ...entry, ...draft.slotDefPatch } : entry;
  const fixedLength = resolveCollectionFixedLength(
    effectiveEntry?.minItems,
    effectiveEntry?.maxItems
  );
  const dsKind = collectionDataSourceKind(effectiveEntry?.dataSource);

  const builtinCatalog =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin"
      ? effectiveEntry.dataSource.catalog
      : "products";
  const builtinSort =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin"
      ? (effectiveEntry.dataSource.sort ?? DEFAULT_BUILTIN_COLLECTION_SORT)
      : DEFAULT_BUILTIN_COLLECTION_SORT;
  const builtinExtract =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin"
      ? (effectiveEntry.dataSource.extract ?? DEFAULT_BUILTIN_COLLECTION_EXTRACT)
      : DEFAULT_BUILTIN_COLLECTION_EXTRACT;

  const previewValues = previewPayload.values[slot.slotId];
  const filledCount = countFilledItems(previewValues, itemFields);

  const [lengthDraft, setLengthDraft] = useState(String(fixedLength));

  useEffect(() => {
    setLengthDraft(String(fixedLength));
  }, [fixedLength, slot.slotId]);

  const commitLength = () => {
    const n = clampFixedLength(Number(lengthDraft));
    if (!Number.isFinite(Number(lengthDraft)) || Number(lengthDraft) < COLLECTION_FIXED_LENGTH_MIN) {
      setLengthDraft(String(fixedLength));
      return;
    }
    setLengthDraft(String(n));
    onFixedLengthChange(n);
  };

  const handleKindChange = (nextKind: CollectionDataSourceKind) => {
    if (nextKind === dsKind) return;
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    onDraftChange(
      switchCollectionDataSourceDraft(
        current,
        snap,
        nextKind,
        itemFields,
        previewPayload,
        slot.slotId
      )
    );
  };

  const handleCatalogChange = (catalog: BuiltinCollectionCatalogId) => {
    if (catalog === builtinCatalog) return;
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    onDraftChange(
      applyBuiltinCollectionCatalogToDraft(
        current,
        snap,
        itemFields,
        catalog,
        previewPayload,
        slot.slotId
      )
    );
  };

  const handleSortChange = (sort: BuiltinCollectionSortId) => {
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    onDraftChange(
      applyBuiltinCollectionSortToDraft(
        current,
        snap,
        itemFields,
        sort,
        previewPayload,
        slot.slotId
      )
    );
  };

  const handleExtractKindChange = (kind: BuiltinCollectionExtract["kind"]) => {
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    const anchorOptions = listCollectionSlotIdsForExtract(previewPayload, slot.slotId);
    const nextExtract: BuiltinCollectionExtract =
      kind === "similarTo"
        ? {
            kind: "similarTo",
            fromSlotId: anchorOptions[0] ?? "",
            matchField: "href",
          }
        : { kind: "none" };
    onDraftChange(
      applyBuiltinCollectionExtractToDraft(
        current,
        snap,
        itemFields,
        nextExtract,
        previewPayload,
        slot.slotId
      )
    );
  };

  const handleExtractFromSlotChange = (fromSlotId: string) => {
    if (builtinExtract.kind !== "similarTo") return;
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    onDraftChange(
      applyBuiltinCollectionExtractToDraft(
        current,
        snap,
        itemFields,
        { ...builtinExtract, fromSlotId },
        previewPayload,
        slot.slotId
      )
    );
  };

  return (
    <section className="collection-variable-panel">
      <Field
        label="数据源类型"
        hint="自定义：手填或粘贴 JSON 预览。内置：使用编辑器商品/专辑 mock 池，可配置排序；商业化时由平台按契约解析。"
      >
        <CollectionDataSourceKindSegment
          slotId={slot.slotId}
          value={dsKind}
          disabled={detached}
          onChange={handleKindChange}
        />
      </Field>

      {dsKind === "builtin" ? (
        <>
          <Field label="内置目录" hint="商品/专辑 mock 范围；切换后自动刷新列表预览数据。">
            <BuiltinCollectionCatalogSelect
              value={builtinCatalog}
              disabled={detached}
              onChange={handleCatalogChange}
            />
          </Field>
          <BuiltinCollectionRulesFields
            slotId={slot.slotId}
            payload={previewPayload}
            sort={builtinSort}
            extract={builtinExtract}
            disabled={detached}
            onSortChange={handleSortChange}
            onExtractKindChange={handleExtractKindChange}
            onExtractFromSlotChange={handleExtractFromSlotChange}
          />
        </>
      ) : null}

      <Field
        label="数据源"
        hint={
          dsKind === "builtin"
            ? "内置模式下列表规则已在上方配置；弹窗仅用于确认预览（可选）。"
            : "配置 JSON 样本与字段关联（类型切换请在上方）。"
        }
      >
        <ShopSecondaryButton htmlType="button" disabled={detached} onClick={onOpenDataSourceModal}>
          配置数据源…
        </ShopSecondaryButton>
      </Field>

      <Field label="列表长度" hint={`邮件版式固定展示项数，范围 ${COLLECTION_FIXED_LENGTH_MIN}–${COLLECTION_FIXED_LENGTH_MAX}。`}>
        <ShopInput
          type="number"
          min={COLLECTION_FIXED_LENGTH_MIN}
          max={COLLECTION_FIXED_LENGTH_MAX}
          value={lengthDraft}
          disabled={detached}
          onChange={(e) => setLengthDraft(e.target.value)}
          onBlur={commitLength}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitLength();
            }
          }}
        />
      </Field>

      <Field
        label="列表行字段配置"
        hint="声明每一项包含哪些列（itemFields）；在弹窗中通过 Tab 切换编辑各字段，写入 payload.slots。"
      >
        <p className="inspector__muted collection-variable-panel__item-fields-summary">
          {summarizeItemFields(itemFields)}
        </p>
        <ShopSecondaryButton
          htmlType="button"
          disabled={detached}
          onClick={() => setItemFieldsModalOpen(true)}
        >
          配置行字段…
        </ShopSecondaryButton>
        <CollectionItemFieldsModal
          visible={itemFieldsModalOpen}
          slotId={slot.slotId}
          slotLabel={slot.label}
          itemFields={itemFields}
          disabled={detached}
          onClose={() => setItemFieldsModalOpen(false)}
          onApply={onItemFieldsChange}
        />
      </Field>

      <Field
        label="关联后预览"
        hint="只读回显：按列表项切换查看当前数据源关联后的合并结果；修改数据请使用「配置数据源…」。"
      >
        <CollectionLinkedPreviewTabs
          slotId={slot.slotId}
          itemFields={itemFields}
          values={previewValues}
          fixedLength={fixedLength}
          filledCount={filledCount}
        />
      </Field>
    </section>
  );
}
