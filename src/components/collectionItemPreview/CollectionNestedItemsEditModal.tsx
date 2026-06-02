import { useEffect, useMemo, useState } from "react";
import { coerceCollectionFieldValue } from "../../lib/collectionDataSource";
import { isCollectionField } from "../../payload-contract/collection-item-fields";
import type { BindingCollectionField } from "../../types/email";
import type { CollectionPreviewField } from "./types";
import { CollectionItemPreviewFieldRows } from "./CollectionItemPreviewFieldRows";
import { CollectionItemPreviewTabNav } from "./CollectionItemPreviewTabNav";
import { normalizeCollectionPreviewRows } from "./collectionItemPreviewUtils";
import { ShopPrimaryButton, ShopSecondaryButton } from "../ui/ShopFormControls";
import { ShopSectionModal } from "../ui/ShopSectionModal";

type NestedCollectionField = Extract<BindingCollectionField, { valueType: "collection" }>;

type Props = {
  visible: boolean;
  parentRowIndex: number;
  field: NestedCollectionField;
  value: unknown;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (nextValue: unknown[]) => void;
};

export function CollectionNestedItemsEditModal({
  visible,
  parentRowIndex,
  field,
  value,
  disabled = false,
  onClose,
  onConfirm,
}: Props) {
  const nestedFields: BindingCollectionField[] = field.itemFields ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [draftRows, setDraftRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!visible) return;
    const rows = normalizeCollectionPreviewRows(value, undefined, false);
    setDraftRows(rows.map((row) => ({ ...row })));
    setActiveIndex(0);
  }, [visible, value]);

  const total = draftRows.length;
  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(total - 1, 0));
  const activeRow = draftRows[safeIndex] ?? {};
  const panelIdPrefix = `nested-${field.key}-${parentRowIndex}`;

  const title = useMemo(() => {
    const label = field.label?.trim() || field.key;
    return `${label} · 第 ${parentRowIndex + 1} 项`;
  }, [field.key, field.label, parentRowIndex]);

  const handleFieldChange = (fieldKey: string, nextValue: unknown) => {
    const col = nestedFields.find((f) => f.key === fieldKey);
    if (!col || isCollectionField(col)) return;
    const coerced = coerceCollectionFieldValue(nextValue, col);
    setDraftRows((prev) =>
      prev.map((row, index) =>
        index === safeIndex ? { ...row, [fieldKey]: coerced } : row
      )
    );
  };

  const handleConfirm = () => {
    const normalized = draftRows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const col of nestedFields) {
        if (isCollectionField(col)) continue;
        out[col.key] = coerceCollectionFieldValue(row[col.key], col);
      }
      return out;
    });
    onConfirm(normalized);
    onClose();
  };

  return (
    <ShopSectionModal
      title={title}
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap collection-nested-edit-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" disabled={disabled} onClick={handleConfirm}>
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="collection-nested-edit-modal">
        {total === 0 ? (
          <p className="inspector__muted">暂无子项数据</p>
        ) : (
          <>
            <p className="collection-linked-preview__meta inspector__muted">
              共 {total} 条 · 切换编辑各规格
            </p>
            <CollectionItemPreviewTabNav
              panelIdPrefix={panelIdPrefix}
              total={total}
              activeIndex={safeIndex}
              onSelect={setActiveIndex}
            />
            <section
              className="payload-collection__item collection-linked-preview__panel"
              aria-labelledby={`${panelIdPrefix}-tab-${safeIndex}`}
            >
              <div className="payload-collection__item-header readonly-collection-preview__item-header">
                <strong>第 {safeIndex + 1} 项</strong>
                <span className="inspector__muted">
                  {safeIndex + 1} / {total}
                </span>
              </div>
              <CollectionItemPreviewFieldRows
                fields={nestedFields}
                row={activeRow}
                mode="editable"
                disabled={disabled}
                onFieldChange={handleFieldChange}
              />
            </section>
          </>
        )}
      </div>
    </ShopSectionModal>
  );
}

/** 子列表弹窗：仅当 field 为 collection 类型时渲染 */
export function CollectionNestedItemsEditModalGate({
  field,
  ...rest
}: Omit<Props, "field"> & { field: CollectionPreviewField }) {
  if (!isCollectionField(field)) return null;
  return <CollectionNestedItemsEditModal field={field} {...rest} />;
}
