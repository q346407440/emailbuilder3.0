import { useEffect, useMemo, useState } from "react";
import { coerceCollectionFieldValue } from "../../lib/collectionDataSource";
import { isCollectionField } from "../../payload-contract/collection-item-fields";
import { isCollectionItemVisible } from "../../lib/collectionItemVisibility";
import { CollectionItemPreviewFieldRows } from "./CollectionItemPreviewFieldRows";
import { CollectionItemPreviewTabNav } from "./CollectionItemPreviewTabNav";
import type { CollectionItemPreviewMode, CollectionPreviewField } from "./types";
import {
  normalizeCollectionPreviewRows,
  rowHasPreviewFieldData,
} from "./collectionItemPreviewUtils";

export type CollectionItemPreviewProps = {
  slotId: string;
  fields: CollectionPreviewField[];
  values: unknown;
  mode?: CollectionItemPreviewMode;
  tabCount?: number;
  padToTabCount?: boolean;
  requireNonemptyRow?: boolean;
  itemVisibility?: boolean[];
  onItemHiddenChange?: (index: number, hidden: boolean) => void;
  visibilityDisabled?: boolean;
  disabled?: boolean;
  /** 标量或嵌套子列表变更（由父组件写回 draft） */
  onFieldChange?: (rowIndex: number, fieldKey: string, value: unknown) => void;
  emptyHint?: string;
  metaHint?: string;
};

export function CollectionItemPreview({
  slotId,
  fields,
  values,
  mode = "readonly",
  tabCount,
  padToTabCount = false,
  requireNonemptyRow = false,
  itemVisibility,
  onItemHiddenChange,
  visibilityDisabled = false,
  disabled = false,
  onFieldChange,
  emptyHint,
  metaHint,
}: CollectionItemPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const readonly = mode === "readonly" || disabled;

  const rows = useMemo(
    () => normalizeCollectionPreviewRows(values, tabCount, padToTabCount),
    [padToTabCount, tabCount, values]
  );

  const visibleTabCount = padToTabCount && tabCount != null ? tabCount : rows.length;

  const hasPreviewData = requireNonemptyRow
    ? rows.some((row) => rowHasPreviewFieldData(row, fields))
    : rows.length > 0;

  useEffect(() => {
    const maxIndex = Math.max(visibleTabCount - 1, 0);
    setActiveIndex((prev) => (prev > maxIndex ? maxIndex : prev));
  }, [slotId, visibleTabCount]);

  if (fields.length === 0) {
    return <p className="inspector__muted">尚未配置字段</p>;
  }

  if (!hasPreviewData) {
    return (
      <p className="inspector__muted">
        {emptyHint ?? "暂无预览数据 · 从 JSON 导入"}
      </p>
    );
  }

  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(visibleTabCount - 1, 0));
  const activeItem = rows[safeIndex] ?? {};
  const panelIdPrefix = `${slotId}-collection-item-preview`;
  const activeHidden = !isCollectionItemVisible(itemVisibility, safeIndex);
  const canEditVisibility = Boolean(onItemHiddenChange) && !visibilityDisabled;

  const metaText =
    metaHint ??
    (mode === "editable"
      ? `共 ${visibleTabCount} 条 · 切换查看；直接改字段值`
      : `共 ${visibleTabCount} 条 · 切换查看${
          canEditVisibility ? "；勾选「不展示」的行不会出现在画布" : "，仅供回显不可编辑"
        }`);

  const handleFieldChange = (fieldKey: string, rawValue: unknown) => {
    const field = fields.find((f) => f.key === fieldKey);
    if (!field) return;
    const coerced = isCollectionField(field)
      ? rawValue
      : coerceCollectionFieldValue(rawValue, field);
    onFieldChange?.(safeIndex, fieldKey, coerced);
  };

  return (
    <div
      className={[
        "payload-collection",
        readonly ? "payload-collection--readonly" : "payload-collection--editable",
      ]
        .filter(Boolean)
        .join(" ")}
      data-slot-id={slotId}
    >
      <p className="collection-linked-preview__meta inspector__muted">{metaText}</p>
      <CollectionItemPreviewTabNav
        panelIdPrefix={panelIdPrefix}
        total={visibleTabCount}
        activeIndex={safeIndex}
        itemVisibility={itemVisibility}
        onSelect={setActiveIndex}
      />
      <section
        id={`${panelIdPrefix}-panel-${safeIndex}`}
        role="tabpanel"
        aria-labelledby={`${panelIdPrefix}-tab-${safeIndex}`}
        className={[
          "payload-collection__item",
          "collection-linked-preview__panel",
          activeHidden ? "readonly-collection-preview__panel--hidden" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="payload-collection__item-header readonly-collection-preview__item-header">
          <div className="readonly-collection-preview__item-title">
            <strong>第 {safeIndex + 1} 项</strong>
            {canEditVisibility ? (
              <label className="readonly-collection-preview__hide-toggle">
                <input
                  type="checkbox"
                  checked={activeHidden}
                  onChange={(event) => onItemHiddenChange?.(safeIndex, event.target.checked)}
                />
                <span>不展示</span>
              </label>
            ) : null}
          </div>
          <span className="inspector__muted">
            {safeIndex + 1} / {visibleTabCount}
          </span>
        </div>
        <CollectionItemPreviewFieldRows
          fields={fields}
          row={activeItem}
          mode={readonly ? "readonly" : "editable"}
          rowIndex={safeIndex}
          disabled={disabled}
          onFieldChange={onFieldChange ? handleFieldChange : undefined}
        />
      </section>
    </div>
  );
}
