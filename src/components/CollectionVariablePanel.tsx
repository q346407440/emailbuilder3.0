import { useEffect, useState } from "react";
import type { EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { isSceneCollectionPresetManagedSlot } from "../lib/sceneCollectionPresetSlot";
import {
  COLLECTION_FIXED_LENGTH_MAX,
  COLLECTION_FIXED_LENGTH_MIN,
  clampFixedLength,
  resolveCollectionFixedLength,
} from "../lib/collectionDataSource";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import {
  applyBuiltinAlbumConfigToDraft,
  applyBuiltinCollectionExtractToDraft,
  applyBuiltinCollectionSortToDraft,
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
  BUILTIN_PRODUCT_SKU_ITEM_FIELDS,
  BUILTIN_PRODUCT_SPU_ITEM_FIELDS,
} from "../payload-contract/builtin-collection-item-fields";
import {
  DEFAULT_BUILTIN_COLLECTION_EXTRACT,
  type BuiltinCollectionExtract,
} from "../payload-contract/collection-builtin-extract";
import {
  DEFAULT_BUILTIN_COLLECTION_SORT,
  type BuiltinCollectionSortId,
} from "../payload-contract/collection-builtin-sort";
import { listCollectionSlotIdsForExtract } from "../lib/resolveBuiltinCollectionItems";
import { BuiltinAlbumListConfigFields } from "./BuiltinAlbumListConfigFields";
import { BuiltinCollectionRulesFields } from "./BuiltinCollectionRulesFields";
import { BuiltinProductListConfigFields } from "./BuiltinProductListConfigFields";
import { collectionDataSourceKind, toCollectionItems, type PayloadSlotDraft } from "../lib/payloadSlotDraft";
import { CollectionItemFieldsModal } from "./CollectionItemFieldsModal";
import { CollectionLinkedPreviewTabs } from "./CollectionLinkedPreviewTabs";
import { CollectionDisplayRuleModal } from "./CollectionDisplayRuleModal";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Field } from "./ui/Field";
import { ShopInput, ShopSecondaryButton } from "./ui/ShopFormControls";
import { applyCollectionDisplayRule } from "../lib/collectionDisplayRule";
import type { CollectionDisplayRule } from "../payload-contract/types";

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

function summarizeDisplayRule(rule: CollectionDisplayRule | undefined): string {
  if (!rule) return "未启用（默认展示全部列表项）";
  const keyField = rule.keyField?.trim() || "type";
  const parts: string[] = [`匹配字段：${keyField}`];
  if (rule.includeValues?.length) parts.push(`包含 ${rule.includeValues.length} 项`);
  if (rule.excludeValues?.length) parts.push(`排除 ${rule.excludeValues.length} 项`);
  return parts.join(" · ");
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
  const [displayRuleModalOpen, setDisplayRuleModalOpen] = useState(false);
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
  const builtinProductConfig =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin" &&
    effectiveEntry.dataSource.catalog === "products"
      ? normalizeBuiltinProductListConfig(
          effectiveEntry.dataSource.productConfig ?? DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG
        )
      : DEFAULT_BUILTIN_PRODUCT_LIST_CONFIG;
  const builtinAlbumConfig =
    effectiveEntry?.dataSource?.type === "remote" &&
    effectiveEntry.dataSource.provider === "builtin" &&
    effectiveEntry.dataSource.catalog === "albums"
      ? normalizeBuiltinAlbumListConfig(
          effectiveEntry.dataSource.albumConfig ?? DEFAULT_BUILTIN_ALBUM_LIST_CONFIG
        )
      : DEFAULT_BUILTIN_ALBUM_LIST_CONFIG;

  const previewValuesRaw = previewPayload.values[slot.slotId];
  const previewValues = applyCollectionDisplayRule(toCollectionItems(previewValuesRaw), effectiveEntry?.displayRule);
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
      kind === "similarTo" || kind === "complement"
        ? {
            kind,
            fromSlotId: anchorOptions[0] ?? "",
            anchorItemIndex: 1,
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
    if (builtinExtract.kind !== "similarTo" && builtinExtract.kind !== "complement") return;
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

  const handleAnchorItemIndexChange = (anchorItemIndex: number) => {
    if (builtinExtract.kind !== "similarTo" && builtinExtract.kind !== "complement") return;
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    onDraftChange(
      applyBuiltinCollectionExtractToDraft(
        current,
        snap,
        itemFields,
        { ...builtinExtract, anchorItemIndex },
        previewPayload,
        slot.slotId
      )
    );
  };

  const handleProductConfigChange = (productConfig: BuiltinProductListConfig) => {
    const current = ensureDraft();
    const snap = draftToCollectionSnapshot(current, itemFields, committedPayload.values[slot.slotId]);
    const prevGranularity = snap.productConfig?.rowGranularity ?? "spu";
    let nextItemFields = itemFields;
    if (productConfig.rowGranularity !== prevGranularity) {
      nextItemFields =
        productConfig.rowGranularity === "sku"
          ? BUILTIN_PRODUCT_SKU_ITEM_FIELDS
          : BUILTIN_PRODUCT_SPU_ITEM_FIELDS;
      onItemFieldsChange(nextItemFields);
    }
    onDraftChange(
      applyBuiltinProductConfigToDraft(
        current,
        { ...snap, productConfig },
        nextItemFields,
        productConfig,
        previewPayload,
        slot.slotId
      )
    );
  };

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

  const dataSourceAction = (
    <InspectorTextAction disabled={detached} onClick={onOpenDataSourceModal}>
      配置数据源
    </InspectorTextAction>
  );

  const itemFieldsAction = (
    <InspectorTextAction disabled={detached} onClick={() => setItemFieldsModalOpen(true)}>
      {scenePresetManaged ? "查看行字段" : "配置行字段"}
    </InspectorTextAction>
  );

  const displayRuleAction = (
    <InspectorTextAction disabled={detached} onClick={() => setDisplayRuleModalOpen(true)}>
      配置展示规则
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
            : "自定义列表：粘贴 JSON 样本并配置字段关联；应用后请在变量详情点「保存变量」。"
        }
      >
        <ShopSecondaryButton htmlType="button" disabled={detached} onClick={onOpenDataSourceModal}>
          配置数据源…
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
            sort={builtinSort}
            extract={builtinExtract}
            disabled={detached}
            onSortChange={handleSortChange}
            onExtractKindChange={handleExtractKindChange}
            onExtractFromSlotChange={handleExtractFromSlotChange}
            onAnchorItemIndexChange={handleAnchorItemIndexChange}
          />
        </>
      ) : null}

      {showConfig ? previewDataField : null}

      {showConfig ? (
        <Field
          label="列表长度"
          {...(panelLayout
            ? {}
            : {
                hint: `邮件版式固定展示项数，范围 ${COLLECTION_FIXED_LENGTH_MIN}–${COLLECTION_FIXED_LENGTH_MAX}。`,
              })}
        >
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

      {showConfig && scenePresetManaged ? (
        <Field
          label="展示规则"
          headerExtra={panelLayout ? displayRuleAction : undefined}
          {...(panelLayout
            ? {}
            : {
                hint: "高级功能：按规则从外部全量列表中筛出可展示子集，避免逐个 block 配显隐。",
              })}
        >
          <p className="inspector__muted collection-variable-panel__item-fields-summary">
            {summarizeDisplayRule(effectiveEntry?.displayRule)}
          </p>
          {panelLayout ? null : (
            <ShopSecondaryButton
              htmlType="button"
              disabled={detached}
              onClick={() => setDisplayRuleModalOpen(true)}
            >
              配置展示规则…
            </ShopSecondaryButton>
          )}
          <CollectionDisplayRuleModal
            visible={displayRuleModalOpen}
            slotId={slot.slotId}
            slotLabel={slot.label}
            rule={effectiveEntry?.displayRule}
            itemFields={itemFields}
            includePresetValues={effectiveEntry?.displayRulePreset?.includeValues}
            includePresetOptions={effectiveEntry?.displayRulePreset?.options}
            keyFieldPreset={effectiveEntry?.displayRulePreset?.keyField}
            scenePresetManaged={scenePresetManaged}
            disabled={detached}
            onClose={() => setDisplayRuleModalOpen(false)}
            onApply={(nextRule) => {
              const current = ensureDraft();
              onDraftChange({
                ...current,
                slotDefPatch: { ...(current.slotDefPatch ?? {}), displayRule: nextRule },
              });
            }}
          />
        </Field>
      ) : null}

      {showPreview ? (
        <Field
          label="关联后预览"
          {...(panelLayout
            ? {}
            : {
                hint: scenePresetManaged
                  ? "只读回显：用于查看当前数据。"
                  : "只读回显：按列表项切换查看当前数据源关联后的合并结果；修改数据请使用「配置数据源…」。",
              })}
        >
          <CollectionLinkedPreviewTabs
            slotId={slot.slotId}
            itemFields={itemFields}
            values={previewValues}
            fixedLength={fixedLength}
            filledCount={filledCount}
          />
        </Field>
      ) : null}
    </section>
  );
}
