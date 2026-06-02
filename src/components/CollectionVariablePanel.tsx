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
import { builtinProductListItemFieldsRequireSpuSelectionOnly } from "../lib/loyaltyMerchantSpuTreePresetSeed";
import {
  applyBuiltinAlbumConfigToDraft,
  applyBuiltinCollectionSortPolicyToDraft,
  applyBuiltinProductConfigToDraft,
  draftToCollectionSnapshot,
} from "../lib/collectionSlotDraft";
import {
  DEFAULT_BUILTIN_ALBUM_LIST_CONFIG,
  DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG,
  normalizeBuiltinAlbumListConfig,
  normalizeBuiltinProductListConfig,
  type BuiltinAlbumListConfig,
  type BuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import {
  BUILTIN_ALBUM_ITEM_FIELDS,
} from "../payload-contract/builtin-collection-item-fields";
import {
  readSortPolicyFromBuiltinDataSource,
  type NormalizedBuiltinSortPolicy,
} from "../payload-contract/collection-builtin-sort-policy";
import { BuiltinAlbumListConfigFields } from "./BuiltinAlbumListConfigFields";
import { BuiltinCollectionRulesFields } from "./BuiltinCollectionRulesFields";
import { BuiltinProductListConfigFields } from "./BuiltinProductListConfigFields";
import { collectionDataSourceKind, toCollectionItems, type PayloadSlotDraft } from "../lib/payloadSlotDraft";
import { CollectionFixedLengthField } from "./CollectionFixedLengthField";
import { CollectionItemFieldsModal } from "./CollectionItemFieldsModal";
import { CollectionItemPreview } from "./collectionItemPreview";
import { hasNonEmptyCollectionItems } from "../lib/collectionFieldMapping";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Field } from "./ui/Field";
import { ShopSecondaryButton } from "./ui/ShopFormControls";
import {
  normalizeItemVisibility,
  setCollectionItemVisibilityAt,
} from "../lib/collectionItemVisibility";

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
  onOpenDataSourceModal: (reimport?: boolean) => void;
  layout?: "panel" | "embedded";
  panelSection?: "all" | "config" | "preview";
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
  onOpenDataSourceModal,
  layout = "embedded",
  panelSection = "all",
}: Props) {
  const panelLayout = layout === "panel";
  const showConfig = panelSection === "all" || panelSection === "config";
  const showPreview = panelSection === "all" || panelSection === "preview";
  const [itemFieldsModalOpen, setItemFieldsModalOpen] = useState(false);
  const itemFields = resolveEffectiveCollectionItemFields(slot, draft);
  const entry = committedPayload.slots[slot.slotId];
  const effectiveEntry = draft?.slotDefPatch ? { ...entry, ...draft.slotDefPatch } : entry;
  const scenePresetManaged = isSceneCollectionPresetManagedSlot(effectiveEntry);
  const itemFieldsReadonly = detached || scenePresetManaged;
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
  const builtinSortPolicy =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin"
      ? readSortPolicyFromBuiltinDataSource(effectiveEntry.dataSource)
      : ({ kind: "regular", sort: "catalogOrder" } as NormalizedBuiltinSortPolicy);
  const spuSelectionOnlyPicker = builtinProductListItemFieldsRequireSpuSelectionOnly(itemFields);
  const builtinProductConfig =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin" &&
    effectiveEntry.dataSource.catalog === "products"
      ? normalizeBuiltinProductListConfig({
          ...(effectiveEntry.dataSource.productConfig ?? DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG),
          ...(spuSelectionOnlyPicker ? { productSelectionScope: "spuOnly" as const } : {}),
        })
      : DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG;
  const builtinAlbumConfig =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin" &&
    effectiveEntry.dataSource.catalog === "albums"
      ? normalizeBuiltinAlbumListConfig(
          effectiveEntry.dataSource.albumConfig ?? DEFAULT_BUILTIN_ALBUM_LIST_CONFIG
        )
      : DEFAULT_BUILTIN_ALBUM_LIST_CONFIG;

  const previewValues = previewPayload.values[slot.slotId];
  const previewItems = toCollectionItems(previewValues);
  const hasImportedPreview =
    dsKind === "custom" && hasNonEmptyCollectionItems(previewItems);
  const manualFormReady =
    dsKind === "custom" && itemFields.length > 0 && !scenePresetManaged && !detached;
  const itemFieldStructureSig = useMemo(
    () => itemFields.map((f) => `${f.key}:${f.valueType ?? ""}`).join("|"),
    [itemFields]
  );
  const effectiveItemVisibility = normalizeItemVisibility(
    fixedLength,
    draft?.slotDefPatch?.itemVisibility ?? effectiveEntry?.itemVisibility
  );

  const handleSortPolicyChange = (sortPolicy: NormalizedBuiltinSortPolicy) => {
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    onDraftChange(
      applyBuiltinCollectionSortPolicyToDraft(
        current,
        snap,
        itemFields,
        sortPolicy,
        previewPayload,
        slot.slotId
      )
    );
  };

  const handleProductConfigChange = (productConfig: BuiltinProductListConfig) => {
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    const normalizedProductConfig = normalizeBuiltinProductListConfig({
      ...productConfig,
      ...(spuSelectionOnlyPicker ? { productSelectionScope: "spuOnly" as const } : {}),
    });
    onDraftChange(
      applyBuiltinProductConfigToDraft(
        current,
        { ...snap, productConfig: normalizedProductConfig },
        itemFields,
        normalizedProductConfig,
        previewPayload,
        slot.slotId
      )
    );
  };

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

  const handleAlbumConfigChange = (albumConfig: BuiltinAlbumListConfig) => {
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    if (itemFields.length === 0) {
      onItemFieldsChange(BUILTIN_ALBUM_ITEM_FIELDS);
    }
    onDraftChange(
      applyBuiltinAlbumConfigToDraft(
        current,
        { ...snap, albumConfig },
        itemFields.length ? itemFields : BUILTIN_ALBUM_ITEM_FIELDS,
        albumConfig,
        previewPayload,
        slot.slotId
      )
    );
  };

  const dataSourceLabel = hasImportedPreview ? "重新导入 JSON" : "从 JSON 导入";

  const dataSourceAction = (
    <InspectorTextAction
      disabled={detached}
      onClick={() => onOpenDataSourceModal(hasImportedPreview)}
    >
      {dataSourceLabel}
    </InspectorTextAction>
  );

  const itemFieldsAction = (
    <InspectorTextAction disabled={detached} onClick={() => setItemFieldsModalOpen(true)}>
      {scenePresetManaged ? "查看行字段" : "配置行字段"}
    </InspectorTextAction>
  );

  let previewDataField: ReactNode;
  if (scenePresetManaged) {
    previewDataField = null;
  } else {
    previewDataField = panelLayout ? (
      <Field label="数据源" headerExtra={dataSourceAction}>
        {null}
      </Field>
    ) : (
      <Field
        label="数据源"
        hint={
          dsKind === "builtin"
            ? "内置商品/专辑列表：在上方配置范围与规则；预览由系统 mock 解析。"
            : hasImportedPreview
              ? "日常在下方数据预览改值；整批替换请点「重新导入 JSON」，粘贴后点确定即可。保存请点「保存变量」。"
              : manualFormReady
                ? "可手动填写，或点「从 JSON 导入」粘贴 JSON 后确定，自动写入行字段与数据预览。"
                : "先配置行字段后手动填写，或点「从 JSON 导入」一次性写入行字段与数据。"
        }
      >
        <ShopSecondaryButton
          htmlType="button"
          disabled={detached}
          onClick={() => onOpenDataSourceModal(hasImportedPreview)}
        >
          {dataSourceLabel}…
        </ShopSecondaryButton>
      </Field>
    );
  }

  return (
    <section
      className={[
        "collection-variable-panel",
        panelLayout ? "collection-variable-panel--panel" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showConfig && dsKind === "builtin" ? (
        <>
          {builtinCatalog === "products" ? (
            <BuiltinProductListConfigFields
              config={builtinProductConfig}
              disabled={detached}
              onChange={handleProductConfigChange}
            />
          ) : (
            <BuiltinAlbumListConfigFields
              config={builtinAlbumConfig}
              disabled={detached}
              onChange={handleAlbumConfigChange}
            />
          )}
          <BuiltinCollectionRulesFields
            slotId={slot.slotId}
            payload={previewPayload}
            catalog={builtinCatalog}
            sortPolicy={builtinSortPolicy}
            disabled={detached}
            onSortPolicyChange={handleSortPolicyChange}
          />
        </>
      ) : null}

      {showConfig ? previewDataField : null}

      {showConfig ? (
        <CollectionFixedLengthField
          slotId={slot.slotId}
          fixedLength={fixedLength}
          disabled={detached}
          disabledReason={detached ? "变量已解除外部绑定，恢复绑定后可改列表长度。" : undefined}
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
                  ? "内置场景变量字段为只读，弹窗仅可查看。"
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
              {scenePresetManaged ? "查看行字段…" : "配置行字段…"}
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
                    ? hasImportedPreview
                      ? "切换 Tab 逐条改值；子列表点「编辑」。勾选「不展示」后该行不出现在画布。保存请点「保存变量」。"
                      : "已按列表长度生成空行，请直接填写；保存请点「保存变量」。"
                    : "切换查看每条数据；勾选「不展示」后该行不会出现在画布列表。",
              })}
        >
          <CollectionItemPreview
            slotId={slot.slotId}
            fields={itemFields}
            values={previewValues}
            mode={detached || scenePresetManaged || dsKind !== "custom" ? "readonly" : "editable"}
            tabCount={fixedLength}
            padToTabCount={manualFormReady || hasImportedPreview}
            requireNonemptyRow={!manualFormReady}
            emptyHint={
              itemFields.length === 0
                ? "请先配置列表行字段，保存后即可在此逐条填写"
                : undefined
            }
            disabled={detached || scenePresetManaged}
            itemVisibility={effectiveItemVisibility}
            visibilityDisabled={detached}
            onItemHiddenChange={(index, hidden) => {
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
