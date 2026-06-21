import { useCallback, useEffect, useMemo, useState } from "react";
import { toastError, toastSuccess } from "../lib/appToast";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import type { ExternalVariableSlotInfo } from "../lib/payloadSlots";
import { builtinPreviewItemsForSlot, extractArrayFromJsonRoot } from "../lib/collectionDataSource";
import {
  buildCollectionFieldPickerRows,
  buildDefaultCollectionFieldMap,
  collectionItemsToJsonPaste,
  inferCollectionItemFieldsFromFirstRow,
  listPickerKeysForSample,
  parseCollectionJsonSample,
  parseCollectionJsonTextWithFieldMap,
  type CollectionJsonSample,
} from "../lib/collectionFieldMapping";
import { toCollectionItems } from "../lib/payloadSlotDraft";
import {
  defaultExpandedCollectionGroupPaths,
  flattenItemFieldsForFieldMap,
  validateCollectionFieldMapDepth,
} from "../lib/collectionFieldMappingTree";
import { validateCollectionItemFields } from "../lib/collectionItemFieldsEdit";
import { resolveEffectiveCollectionItemFields } from "../lib/collectionSlotEffective";
import {
  draftToCollectionSnapshot,
  patchCollectionDraftSnapshot,
  readCollectionFieldMapFromCache,
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
  /** 重新导入：按 JSON 首项刷新列表行字段结构 */
  reimportMode?: boolean;
  onDraftChange: (draft: PayloadSlotDraft) => void;
  onClose: () => void;
  onApply: () => void;
};

function countJsonListItems(jsonText: string): number | null {
  const trimmed = jsonText.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const extracted = extractArrayFromJsonRoot(parsed);
    return extracted.ok ? extracted.items.length : null;
  } catch {
    return null;
  }
}

function JsonSamplePreviewTable({
  sample,
  previewItemFields,
}: {
  sample: CollectionJsonSample;
  previewItemFields: BindingCollectionField[];
}) {
  const rows = buildCollectionFieldPickerRows(sample, previewItemFields).slice(0, 8);
  if (rows.length === 0) return null;
  return (
    <div className="collection-ds-bind-modal__sample-preview">
      <p className="collection-ds-bind-modal__sample-preview-title">首条数据预览</p>
      <table className="collection-ds-bind-modal__sample-table">
        <thead>
          <tr>
            <th scope="col">字段</th>
            <th scope="col">示例值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td className="collection-ds-bind-modal__sample-value">{row.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sample.keys.length > rows.length ? (
        <p className="inspector__muted collection-ds-bind-modal__sample-more">
          另有 {sample.keys.length - rows.length} 个字段
        </p>
      ) : null}
    </div>
  );
}

export function CollectionDataSourceBindModal({
  visible,
  slot,
  committedPayload,
  draft,
  reimportMode = false,
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
  const [previewSample, setPreviewSample] = useState<CollectionJsonSample | null>(null);

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

  useEffect(() => {
    if (!visible) return;
    setJsonError("");
    if (
      reimportMode &&
      snapshot.kind === "custom" &&
      !snapshot.jsonPaste.trim()
    ) {
      const items =
        snapshot.items.length > 0
          ? snapshot.items
          : toCollectionItems(committedPayload.values[slot.slotId]);
      if (items.length > 0) {
        pushSnapshot({
          ...snapshot,
          jsonPaste: collectionItemsToJsonPaste(items),
        });
      }
    }
  }, [
    visible,
    slot.slotId,
    reimportMode,
    snapshot.kind,
    snapshot.jsonPaste,
    snapshot.items,
    committedPayload.values,
    pushSnapshot,
  ]);

  /** 仅解析预览，不写草稿 */
  useEffect(() => {
    if (!visible || snapshot.kind !== "custom") return;
    const text = snapshot.jsonPaste.trim();
    if (!text) {
      setPreviewSample(null);
      setJsonError("");
      return;
    }
    const result = parseCollectionJsonSample(text);
    if (!result.ok) {
      setPreviewSample(null);
      setJsonError(result.error);
      return;
    }
    setPreviewSample(result.sample);
    setJsonError("");
  }, [visible, snapshot.kind, snapshot.jsonPaste]);

  const previewItemFields = useMemo(() => {
    if (!previewSample) return itemFields;
    if (itemFields.length > 0 && !reimportMode) return itemFields;
    return inferCollectionItemFieldsFromFirstRow(previewSample.firstItem);
  }, [previewSample, itemFields, reimportMode]);

  const resolveFieldMapForParse = (
    fields: BindingCollectionField[],
    pickerKeys: string[]
  ): Record<string, string> => {
    const map = { ...buildDefaultCollectionFieldMap(fields, pickerKeys), ...fieldMap };
    const expanded = defaultExpandedCollectionGroupPaths(fields);
    for (const entry of flattenItemFieldsForFieldMap(fields, expanded)) {
      if (entry.kind !== "leaf") continue;
      if (!map[entry.path]?.trim()) {
        map[entry.path] = entry.path.includes(".") ? entry.path : entry.field.key;
      }
    }
    return map;
  };

  const applyJsonImport = (jsonText: string): boolean => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setJsonError("请粘贴 JSON 数据");
      toastError("请粘贴 JSON 数据");
      return false;
    }

    const sampleResult = parseCollectionJsonSample(trimmed);
    if (!sampleResult.ok) {
      setJsonError(sampleResult.error);
      toastError(sampleResult.error);
      return false;
    }

    const shouldInferFields = itemFields.length === 0 || reimportMode;
    const effectiveItemFields = shouldInferFields
      ? inferCollectionItemFieldsFromFirstRow(sampleResult.sample.firstItem)
      : itemFields;

    if (effectiveItemFields.length === 0) {
      const err = "未能从 JSON 首项推断出列表行字段，请检查数据结构";
      setJsonError(err);
      toastError(err);
      return false;
    }

    const fieldErr = validateCollectionItemFields(effectiveItemFields);
    if (fieldErr) {
      setJsonError(fieldErr);
      toastError(fieldErr);
      return false;
    }

    const pickerKeys = listPickerKeysForSample(sampleResult.sample, effectiveItemFields);
    const map = resolveFieldMapForParse(effectiveItemFields, pickerKeys);
    const depthCheck = validateCollectionFieldMapDepth(effectiveItemFields, map);
    if (!depthCheck.ok) {
      setJsonError(depthCheck.error);
      toastError(depthCheck.error);
      return false;
    }

    const result = parseCollectionJsonTextWithFieldMap(trimmed, effectiveItemFields, map, {
      fixedLength: snapshot.fixedLength,
    });
    if (!result.ok) {
      setJsonError(result.error);
      toastError(result.error);
      return false;
    }

    setJsonError("");
    const draftExtra: Partial<PayloadSlotDraft> = {
      collectionFieldMap: map,
      value: result.items,
    };
    if (shouldInferFields) {
      draftExtra.slotDefPatch = { itemFields: effectiveItemFields };
    }
    pushSnapshot(
      {
        ...snapshot,
        jsonPaste: trimmed,
        items: result.items,
      },
      draftExtra
    );
    return true;
  };

  const handleConfirm = () => {
    if (snapshot.kind === "builtin") {
      const err = validateCollectionItemFields(itemFields);
      if (err) {
        toastError(err);
        return;
      }
      const items = builtinPreviewItemsForSlot(
        snapshot.catalog,
        itemFields,
        snapshot.fixedLength,
        undefined,
        {
          payload: contextPayload,
          slotId: slot.slotId,
          sortPolicy: snapshot.sortPolicy,
        }
      );
      pushSnapshot({ ...snapshot, kind: "builtin", catalog: snapshot.catalog, items });
      onApply();
      return;
    }

    if (!applyJsonImport(snapshot.jsonPaste)) return;
    toastSuccess("已导入，请在右侧核对列表行字段与数据预览。");
    onApply();
  };

  const jsonListCount = countJsonListItems(snapshot.jsonPaste);
  const jsonLooksValid = previewSample !== null && !jsonError;
  const modalTitle =
    snapshot.kind === "custom"
      ? reimportMode
        ? "重新导入 JSON"
        : "从 JSON 导入列表数据"
      : "配置数据源";
  const slotTitle = slot.label?.trim() || slot.slotId;

  if (snapshot.kind === "custom") {
    return (
      <ShopSectionModal
        title={modalTitle}
        visible={visible}
        centered
        destroyOnClose
        maskClosable={false}
        keyboard
        wrapClassName="text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap collection-ds-bind-modal-wrap"
        onCancel={onClose}
        footer={
          <div className="collection-ds-bind-modal__footer">
            <ShopSecondaryButton htmlType="button" onClick={onClose}>
              取消
            </ShopSecondaryButton>
            <div className="shop-section-modal__footer-actions collection-ds-bind-modal__footer-actions">
              <ShopPrimaryButton
                htmlType="button"
                disabled={!snapshot.jsonPaste.trim()}
                onClick={handleConfirm}
              >
                确定
              </ShopPrimaryButton>
            </div>
          </div>
        }
      >
        <div className="text-body-inline-var-modal collection-ds-bind-modal">
          <div className="collection-ds-bind-modal__context-banner" role="status">
            <span className="collection-ds-bind-modal__context-label">当前变量</span>
            <strong className="collection-ds-bind-modal__context-name">{slotTitle}</strong>
            <span className="collection-ds-bind-modal__context-meta">
              邮件展示 {snapshot.fixedLength} 条
              {reimportMode ? " · 将按 JSON 刷新行字段与数据" : ""}
            </span>
          </div>

          <p className="repeat-region-bind-modal__section-hint">
            粘贴 JSON 数组后点「确定」：自动识别列表行字段并填入右侧数据预览。失败时会提示原因。
          </p>

          <div className="collection-ds-bind-modal__paste-layout">
            <section className="collection-ds-bind-modal__paste-card">
              <Field
                label="JSON 数据"
                hint={'须为对象数组，例如 [{"name":"…","imageSrc":"https://…"}]'}
              >
                <ShopTextArea
                  value={snapshot.jsonPaste}
                  placeholder={'[\n  {\n    "name": "示例商品",\n    "imageSrc": "https://…"\n  }\n]'}
                  rows={12}
                  onChange={(e) => {
                    pushSnapshot({ ...snapshot, jsonPaste: e.target.value });
                  }}
                />
                {jsonError ? (
                  <p className="payload-inspector__meta-error" role="alert">
                    {jsonError}
                  </p>
                ) : null}
              </Field>
            </section>

            <aside className="collection-ds-bind-modal__paste-side">
              <div
                className={[
                  "collection-ds-bind-modal__status-card",
                  jsonLooksValid
                    ? "collection-ds-bind-modal__status-card--ok"
                    : snapshot.jsonPaste.trim()
                      ? "collection-ds-bind-modal__status-card--pending"
                      : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="collection-ds-bind-modal__status-title">校验</span>
                {jsonError && snapshot.jsonPaste.trim() ? (
                  <p className="collection-ds-bind-modal__status-line collection-ds-bind-modal__status-line--error">
                    {jsonError}
                  </p>
                ) : jsonLooksValid && previewSample ? (
                  <>
                    <p className="collection-ds-bind-modal__status-line">
                      格式正确 · 共 <strong>{jsonListCount ?? "—"}</strong> 条
                    </p>
                    <p className="collection-ds-bind-modal__status-line">
                      将导入 <strong>{previewItemFields.length}</strong> 个顶层行字段
                    </p>
                  </>
                ) : snapshot.jsonPaste.trim() ? (
                  <p className="collection-ds-bind-modal__status-line">正在校验…</p>
                ) : (
                  <p className="collection-ds-bind-modal__status-line">等待粘贴 JSON</p>
                )}
              </div>

              {jsonLooksValid && previewSample ? (
                <JsonSamplePreviewTable
                  sample={previewSample}
                  previewItemFields={previewItemFields}
                />
              ) : (
                <div className="collection-ds-bind-modal__paste-placeholder">
                  <p>粘贴合法 JSON 后，这里显示首条数据预览，便于确认字段是否正确。</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </ShopSectionModal>
    );
  }

  return (
    <ShopSectionModal
      title={modalTitle}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap collection-ds-bind-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" onClick={handleConfirm}>
            应用
          </ShopPrimaryButton>
        </div>
      }
    >
      <p className="inspector__muted">
        商品/专辑范围与列表规则请在右侧变量面板配置。应用后将保存当前内置预览数据。
      </p>
    </ShopSectionModal>
  );
}
