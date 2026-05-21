import { useEffect, useMemo, useState } from "react";
import type { BindingCollectionField } from "../types/email";
import { toCollectionItems } from "../lib/payloadSlotDraft";
import { ShopInput } from "./ui/ShopFormControls";

type Props = {
  slotId: string;
  itemFields: BindingCollectionField[];
  values: unknown;
  fixedLength: number;
  filledCount: number;
};

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function CollectionLinkedPreviewTabs({
  slotId,
  itemFields,
  values,
  fixedLength,
  filledCount,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const raw = toCollectionItems(values);
    const padded = raw.slice(0, fixedLength).map((row) => ({ ...row }));
    while (padded.length < fixedLength) {
      padded.push({});
    }
    return padded;
  }, [fixedLength, values]);

  useEffect(() => {
    setActiveIndex((prev) => (prev >= fixedLength ? Math.max(0, fixedLength - 1) : prev));
  }, [fixedLength, slotId]);

  if (itemFields.length === 0) {
    return <p className="inspector__muted">尚未配置行字段</p>;
  }

  if (filledCount === 0) {
    return (
      <p className="inspector__muted">
        已配置 {fixedLength} 项 · 暂无预览数据（请通过「配置数据源…」关联并填入）
      </p>
    );
  }

  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, fixedLength - 1));
  const activeItem = items[safeIndex] ?? {};

  return (
    <div className="payload-collection payload-collection--readonly" data-slot-id={slotId}>
      <p className="collection-linked-preview__meta inspector__muted">
        已关联 {filledCount}/{fixedLength} 项有数据 · 以下仅供回显，不可编辑
      </p>
      <div className="payload-collection__tabs" role="tablist" aria-label="关联数据预览">
        {Array.from({ length: fixedLength }, (_, index) => {
          const selected = index === safeIndex;
          return (
            <button
              key={`${slotId}-preview-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${slotId}-preview-panel-${index}`}
              id={`${slotId}-preview-tab-${index}`}
              className={`payload-collection__tab ${selected ? "payload-collection__tab--active" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <section
        id={`${slotId}-preview-panel-${safeIndex}`}
        role="tabpanel"
        aria-labelledby={`${slotId}-preview-tab-${safeIndex}`}
        className="payload-collection__item collection-linked-preview__panel"
      >
        <div className="payload-collection__item-header">
          <strong>列表项 {safeIndex + 1}</strong>
          <span className="inspector__muted">
            第 {safeIndex + 1} / {fixedLength} 项
          </span>
        </div>
        {itemFields.map((field) => {
          const stringValue = displayValue(activeItem[field.key]);
          return (
            <label key={field.key} className="payload-collection__field collection-linked-preview__field">
              <span>{field.label || field.key}</span>
              <ShopInput value={stringValue} placeholder="（空）" disabled readOnly />
              {field.valueType === "image" ? (
                <div className="collection-linked-preview__image-frame">
                  {stringValue ? (
                    <img
                      key={`${safeIndex}-${field.key}-${stringValue}`}
                      className="payload-collection__image-preview collection-linked-preview__image"
                      src={stringValue}
                      alt=""
                      decoding="async"
                    />
                  ) : (
                    <span className="inspector__muted collection-linked-preview__image-empty">（无图片）</span>
                  )}
                </div>
              ) : null}
            </label>
          );
        })}
      </section>
    </div>
  );
}
