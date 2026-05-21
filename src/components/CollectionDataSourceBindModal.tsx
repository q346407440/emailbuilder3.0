import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "@shoplazza/sds";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { builtinPreviewItemsForSlot } from "../lib/collectionDataSource";
import {
  buildCollectionFieldPickerRows,
  buildDefaultCollectionFieldMap,
  parseCollectionJsonSample,
  parseCollectionJsonTextWithFieldMap,
  type CollectionJsonSample,
} from "../lib/collectionFieldMapping";
import {
  defaultExpandedCollectionGroupPaths,
  canBindTargetPathToSourceKey,
  collectionFieldMappingDepthMismatchMessage,
  findLeafFieldByMappingPath,
  firstLeafMappingPath,
  flattenItemFieldsForFieldMap,
  validateCollectionFieldMapDepth,
} from "../lib/collectionFieldMappingTree";
import { CollectionFieldPickerTable } from "./CollectionFieldPickerTable";
import { validateCollectionItemFields } from "../lib/collectionItemFieldsEdit";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import {
  draftToCollectionSnapshot,
  patchCollectionDraftSnapshot,
  readCollectionFieldMapFromCache,
  sampleFromCollectionSnapshot,
  type CollectionEditorSnapshot,
} from "../lib/collectionSlotDraft";
import { buildPreviewPayload, type PayloadSlotDraft } from "../lib/payloadSlotDraft";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton, ShopTextArea } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

type Props = {
  visible: boolean;
  slot: ExternalVariableSlotInfo;
  committedPayload: EmailPayload;
  draft: PayloadSlotDraft;
  onDraftChange: (draft: PayloadSlotDraft) => void;
  onClose: () => void;
  onApply: () => void;
};

function groupHasChildMapping(
  groupPath: string,
  itemFields: BindingCollectionField[],
  fieldMap: Record<string, string>
): boolean {
  const parent = itemFields.find((f) => f.key === groupPath && f.valueType === "collection");
  if (!parent || parent.valueType !== "collection") return false;
  return (parent.itemFields ?? []).some((child) => {
    if (child.valueType === "collection") return false;
    return Boolean(fieldMap[`${groupPath}.${child.key}`]?.trim());
  });
}

function SourceFieldMappingSplitPanel({
  visible,
  itemFields,
  fieldMap,
  sample,
  onFieldMapChange,
}: {
  visible: boolean;
  itemFields: BindingCollectionField[];
  fieldMap: Record<string, string>;
  sample: CollectionJsonSample | null;
  onFieldMapChange: (next: Record<string, string>) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    defaultExpandedCollectionGroupPaths(itemFields)
  );
  const [activeMappingPath, setActiveMappingPath] = useState(() => firstLeafMappingPath(itemFields));

  useEffect(() => {
    if (!visible) return;
    setExpandedGroups(defaultExpandedCollectionGroupPaths(itemFields));
    setActiveMappingPath((prev) => {
      if (findLeafFieldByMappingPath(itemFields, prev)) return prev;
      return firstLeafMappingPath(itemFields);
    });
  }, [visible, itemFields]);

  const navEntries = useMemo(
    () => flattenItemFieldsForFieldMap(itemFields, expandedGroups),
    [itemFields, expandedGroups]
  );
  const activeLeaf = findLeafFieldByMappingPath(itemFields, activeMappingPath);
  if (!activeLeaf || !sample) return null;

  const mappedSourceKey = fieldMap[activeMappingPath] ?? "";
  const depthMismatch = collectionFieldMappingDepthMismatchMessage(
    activeMappingPath,
    mappedSourceKey
  );
  const sourceOptions = buildCollectionFieldPickerRows(sample, itemFields);
  const mappedOption = sourceOptions.find((o) => o.key === mappedSourceKey);

  const toggleGroup = (groupPath: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupPath)) next.delete(groupPath);
      else next.add(groupPath);
      return next;
    });
  };

  return (
    <div className="repeat-region-bind-modal__mapping-split">
      <nav className="repeat-region-bind-modal__mapping-tabs" aria-label="列表行字段">
        {navEntries.map((entry) => {
          if (entry.kind === "group") {
            const isExpanded = expandedGroups.has(entry.path);
            const mapped = groupHasChildMapping(entry.path, itemFields, fieldMap);
            return (
              <div
                key={entry.path}
                className="repeat-region-bind-modal__mapping-tab-row"
                style={{ ["--mapping-depth" as string]: String(entry.depth) }}
              >
                <button
                  type="button"
                  className="repeat-region-bind-modal__mapping-expand"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "折叠子字段" : "展开子字段"}
                  onClick={() => toggleGroup(entry.path)}
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
                <button
                  type="button"
                  className="repeat-region-bind-modal__mapping-tab repeat-region-bind-modal__mapping-tab--group"
                  title={entry.path}
                  onClick={() => toggleGroup(entry.path)}
                >
                  <span className="repeat-region-bind-modal__mapping-tab-label">
                    {entry.field.label || entry.path}
                  </span>
                  {mapped ? (
                    <span className="repeat-region-bind-modal__mapping-tab-dot" aria-hidden />
                  ) : null}
                </button>
              </div>
            );
          }

          const isActive = entry.path === activeMappingPath;
          const mapped = Boolean(fieldMap[entry.path]?.trim());
          return (
            <div
              key={entry.path}
              className="repeat-region-bind-modal__mapping-tab-row"
              style={{ ["--mapping-depth" as string]: String(entry.depth) }}
            >
              <span className="repeat-region-bind-modal__mapping-expand-placeholder" aria-hidden />
              <button
                type="button"
                className={`repeat-region-bind-modal__mapping-tab${
                  isActive ? " repeat-region-bind-modal__mapping-tab--active" : ""
                }`}
                title={
                  entry.path !== (entry.field.label || entry.field.key)
                    ? `${entry.field.label} (${entry.path})`
                    : entry.path
                }
                onClick={() => setActiveMappingPath(entry.path)}
              >
                <span className="repeat-region-bind-modal__mapping-tab-label">
                  {entry.field.label || entry.field.key}
                </span>
                {mapped ? (
                  <span className="repeat-region-bind-modal__mapping-tab-dot" aria-hidden />
                ) : null}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="repeat-region-bind-modal__mapping-panel">
        <div className="repeat-region-bind-modal__mapping-panel-head">
          <span className="repeat-region-bind-modal__mapping-panel-target">
            {activeLeaf.field.label || activeLeaf.field.key}
          </span>
          <span
            className={`repeat-region-bind-modal__mapping-panel-current${
              depthMismatch ? " repeat-region-bind-modal__mapping-panel-current--invalid" : ""
            }`}
          >
            当前映射：
            {depthMismatch
              ? depthMismatch
              : mappedOption && mappedOption.key
                ? mappedOption.example !== "—"
                  ? `${mappedOption.label}（${mappedOption.example}）`
                  : mappedOption.label
                : "不映射"}
          </span>
        </div>
        <div className="repeat-region-bind-modal__mapping-panel-scroll">
          <CollectionFieldPickerTable
            ariaLabel="映射到数据源字段"
            name={`collection-ds-field-map-${activeMappingPath.replace(/\./g, "-")}`}
            options={sourceOptions}
            mappedKey={mappedSourceKey}
            activeTargetPath={activeMappingPath}
            onSelect={(key) => {
              if (!canBindTargetPathToSourceKey(activeMappingPath, key)) return;
              onFieldMapChange({ ...fieldMap, [activeMappingPath]: key });
            }}
          />
        </div>
        <p className="repeat-region-bind-modal__mapping-hint">
          左右两侧均支持子列表折叠；须同级绑定（一级对一级、子列表列对 skus.xxx）。应用后按映射写入预览数据。
        </p>
      </div>
    </div>
  );
}

export function CollectionDataSourceBindModal({
  visible,
  slot,
  committedPayload,
  draft,
  onDraftChange,
  onClose,
  onApply,
}: Props) {
  const itemFields = resolveEffectiveCollectionItemFields(slot, draft);
  const contextPayload = useMemo(
    () => buildPreviewPayload(committedPayload, { [slot.slotId]: draft }),
    [committedPayload, draft, slot.slotId]
  );

  const snapshot = useMemo(
    () => draftToCollectionSnapshot(draft, itemFields, committedPayload.values[slot.slotId]),
    [committedPayload.values, draft, itemFields, slot.slotId]
  );

  const [jsonError, setJsonError] = useState("");
  const [sample, setSample] = useState<CollectionJsonSample | null>(null);
  const fieldMap =
    draft.collectionFieldMap ??
    readCollectionFieldMapFromCache(draft.collectionSources, snapshot.kind) ??
    {};

  const pushSnapshot = useCallback(
    (next: CollectionEditorSnapshot, extra?: Partial<PayloadSlotDraft>) => {
      onDraftChange({ ...patchCollectionDraftSnapshot(draft, next), ...extra });
    },
    [draft, onDraftChange]
  );

  const refreshSample = (
    jsonText: string,
    itemsPath?: string
  ): { ok: true; sample: CollectionJsonSample } | { ok: false; error: string } => {
    const result = parseCollectionJsonSample(jsonText, itemsPath);
    if (!result.ok) {
      setSample(null);
      return result;
    }
    setSample(result.sample);
    const defaults = buildDefaultCollectionFieldMap(itemFields, result.sample.keys);
    if (Object.keys(defaults).length > 0) {
      onDraftChange({
        ...draft,
        collectionFieldMap: { ...defaults, ...draft.collectionFieldMap },
      });
    }
    return result;
  };

  useEffect(() => {
    if (!visible) return;
    setJsonError("");
    setSample(sampleFromCollectionSnapshot(snapshot));
  }, [
    visible,
    slot.slotId,
    snapshot.kind,
    snapshot.jsonPaste,
    snapshot.items,
    snapshot.catalog,
    snapshot.sort,
    snapshot.extract,
  ]);

  const resolveFieldMapForParse = (): Record<string, string> => {
    const keys = sample?.keys ?? [];
    const map = { ...buildDefaultCollectionFieldMap(itemFields, keys), ...fieldMap };
    const expanded = defaultExpandedCollectionGroupPaths(itemFields);
    for (const entry of flattenItemFieldsForFieldMap(itemFields, expanded)) {
      if (entry.kind !== "leaf") continue;
      if (!map[entry.path]?.trim()) {
        map[entry.path] = entry.path.includes(".") ? entry.path : entry.field.key;
      }
    }
    return map;
  };

  const applyParsedPreview = (jsonText: string, itemsPath?: string) => {
    const err = validateCollectionItemFields(itemFields);
    if (err) {
      message.error(err);
      return false;
    }
    const sampleResult = refreshSample(jsonText, itemsPath);
    if (!sampleResult.ok) {
      message.error(sampleResult.error);
      return false;
    }
    const map = resolveFieldMapForParse();
    const depthCheck = validateCollectionFieldMapDepth(itemFields, map);
    if (!depthCheck.ok) {
      message.error(depthCheck.error);
      return false;
    }
    const result = parseCollectionJsonTextWithFieldMap(jsonText, itemFields, map, {
      fixedLength: snapshot.fixedLength,
      itemsPath,
    });
    if (!result.ok) {
      setJsonError(result.error);
      message.error(result.error);
      return false;
    }
    setJsonError("");
    pushSnapshot(
      {
        ...snapshot,
        items: result.items,
      },
      { collectionFieldMap: map }
    );
    return true;
  };

  const handleApply = () => {
    const err = validateCollectionItemFields(itemFields);
    if (err) {
      message.error(err);
      return;
    }
    const depthCheck = validateCollectionFieldMapDepth(itemFields, fieldMap);
    if (!depthCheck.ok) {
      message.error(depthCheck.error);
      return;
    }
    if (snapshot.kind === "custom" && snapshot.jsonPaste.trim()) {
      if (!applyParsedPreview(snapshot.jsonPaste)) return;
    } else if (snapshot.kind === "builtin") {
      const items = builtinPreviewItemsForSlot(
        snapshot.catalog,
        itemFields,
        snapshot.fixedLength,
        snapshot.sort,
        {
          payload: contextPayload,
          slotId: slot.slotId,
          extract: snapshot.extract,
        }
      );
      pushSnapshot({ ...snapshot, kind: "builtin", catalog: snapshot.catalog, items });
    }
    onApply();
  };

  const showFieldMapping = itemFields.length > 0 && sample !== null && sample.keys.length > 0;

  return (
    <ShopSectionModal
      title="配置数据源"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap repeat-region-bind-modal-wrap collection-ds-bind-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" onClick={handleApply}>
            应用
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="text-body-inline-var-modal repeat-region-bind-modal collection-ds-bind-modal">
        <p className="inspector__muted repeat-region-bind-modal__empty-hint">
          {snapshot.kind === "custom"
            ? "数据源类型请在右侧变量面板切换。此处粘贴 JSON 并配置字段关联，应用后请在变量详情点「保存变量」。"
            : "数据源类型、内置目录与列表规则请在右侧变量面板配置。应用后将保存当前内置预览数据。"}
        </p>

        {snapshot.kind === "custom" ? (
          <Field label="自定义 JSON">
            <ShopTextArea
              value={snapshot.jsonPaste}
              placeholder={'[{"title":"…","iconSrc":"https://…"}, …]'}
              rows={4}
              onChange={(e) => {
                setJsonError("");
                pushSnapshot({ ...snapshot, jsonPaste: e.target.value });
              }}
            />
            {jsonError ? <p className="payload-inspector__meta-error">{jsonError}</p> : null}
            <div className="payload-collection-config__actions">
              <ShopSecondaryButton
                htmlType="button"
                disabled={!snapshot.jsonPaste.trim()}
                onClick={() => {
                  const r = refreshSample(snapshot.jsonPaste);
                  if (!r.ok) message.error(r.error);
                  else message.success("已识别 JSON 字段");
                }}
              >
                识别 JSON 字段
              </ShopSecondaryButton>
              <ShopSecondaryButton
                htmlType="button"
                disabled={!snapshot.jsonPaste.trim() || itemFields.length === 0}
                onClick={() => {
                  if (applyParsedPreview(snapshot.jsonPaste)) {
                    message.success("已解析并填入预览");
                  }
                }}
              >
                解析并填入预览
              </ShopSecondaryButton>
            </div>
          </Field>
        ) : null}


        {showFieldMapping ? (
          <Field label="字段关联" className="collection-ds-bind-modal__field-mapping">
            <SourceFieldMappingSplitPanel
              key={snapshot.kind}
              visible={visible}
              itemFields={itemFields}
              fieldMap={fieldMap}
              sample={sample}
              onFieldMapChange={(next) =>
                onDraftChange(
                  patchCollectionDraftSnapshot({ ...draft, collectionFieldMap: next }, snapshot)
                )
              }
            />
          </Field>
        ) : snapshot.kind === "custom" && itemFields.length > 0 ? (
          <p className="repeat-region-bind-modal__empty-hint">
            请先粘贴或填写 JSON 样本并点击「识别 JSON 字段」，再进行字段关联。
          </p>
        ) : snapshot.kind === "custom" ? (
          <p className="repeat-region-bind-modal__empty-hint">
            请先在变量详情中配置「列表行字段」，再配置数据源与字段关联。
          </p>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
