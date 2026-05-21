import { useEffect, useState } from "react";
import type { BindingCollectionField } from "../types/email";
import {
  collectionItemFieldTypesForPicker,
  collectionItemFieldValueTypeLabel,
} from "../payload-contract/collection-item-fields";
import { normalizeCollectionItemFieldValueType } from "../payload-contract/value-types";
import { ShopInput, ShopSecondaryButton, ShopSelect } from "./ui/ShopFormControls";

const VALUE_TYPES = collectionItemFieldTypesForPicker();

type Props = {
  itemFields: BindingCollectionField[];
  disabled?: boolean;
  onChange: (next: BindingCollectionField[]) => void;
};

function emptyField(valueType: BindingCollectionField["valueType"] = "string"): BindingCollectionField {
  if (valueType === "collection") {
    return {
      key: "",
      label: "",
      valueType: "collection",
      itemFields: [{ key: "", label: "", valueType: "string" }],
      minItems: 1,
      maxItems: 1,
    };
  }
  return { key: "", label: "", valueType: "string" };
}

function fieldTabLabel(field: BindingCollectionField, index: number): string {
  const label = field.label?.trim();
  const key = field.key?.trim();
  if (label) return label.length > 6 ? `${label.slice(0, 5)}…` : label;
  if (key) return key.length > 8 ? `${key.slice(0, 7)}…` : key;
  return String(index + 1);
}

export function CollectionItemFieldsEditor({ itemFields, disabled, onChange }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (itemFields.length === 0) return 0;
      return prev >= itemFields.length ? itemFields.length - 1 : prev;
    });
  }, [itemFields.length]);

  const updateAt = (index: number, patch: Partial<BindingCollectionField>) => {
    const next = itemFields.map((f, i) =>
      i === index ? ({ ...(f as BindingCollectionField), ...patch } as BindingCollectionField) : f
    );
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(itemFields.filter((_, i) => i !== index));
  };

  const addField = () => {
    onChange([...itemFields, emptyField()]);
    setActiveIndex(itemFields.length);
  };

  const safeIndex =
    itemFields.length === 0 ? 0 : Math.min(Math.max(0, activeIndex), itemFields.length - 1);
  const activeField = itemFields[safeIndex];

  return (
    <div className="collection-item-fields-editor">
      {itemFields.length === 0 ? (
        <p className="inspector__muted">尚未定义行字段。列表变量须先声明每一项包含哪些列，再配置长度与数据源。</p>
      ) : (
        <>
          <div
            className="payload-collection__tabs collection-item-fields-editor__tabs"
            role="tablist"
            aria-label="列表行字段"
          >
            {itemFields.map((field, index) => {
              const selected = index === safeIndex;
              return (
                <button
                  key={`item-field-tab-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  title={field.label?.trim() || field.key || `字段 ${index + 1}`}
                  className={`payload-collection__tab ${selected ? "payload-collection__tab--active" : ""}`}
                  disabled={disabled}
                  onClick={() => setActiveIndex(index)}
                >
                  {fieldTabLabel(field, index)}
                </button>
              );
            })}
          </div>
          {activeField ? (
            <section
              className="collection-item-fields-editor__card"
              role="tabpanel"
              aria-label={`字段 ${safeIndex + 1}`}
            >
              <div className="collection-item-fields-editor__card-head">
                <span className="collection-item-fields-editor__card-title">
                  字段 {safeIndex + 1}
                  {activeField.key.trim() ? (
                    <span className="inspector__muted"> · {activeField.key}</span>
                  ) : null}
                </span>
                <ShopSecondaryButton
                  htmlType="button"
                  disabled={disabled || itemFields.length <= 1}
                  onClick={() => removeAt(safeIndex)}
                  title={itemFields.length <= 1 ? "至少保留一个行字段" : "删除当前字段"}
                >
                  删除
                </ShopSecondaryButton>
              </div>
              <label className="collection-item-fields-editor__field">
                <span className="collection-item-fields-editor__label">标识</span>
                <ShopInput
                  value={activeField.key}
                  placeholder="title"
                  disabled={disabled}
                  onChange={(e) => updateAt(safeIndex, { key: e.target.value })}
                />
              </label>
              <label className="collection-item-fields-editor__field">
                <span className="collection-item-fields-editor__label">名称</span>
                <ShopInput
                  value={activeField.label}
                  placeholder="标题"
                  disabled={disabled}
                  onChange={(e) => updateAt(safeIndex, { label: e.target.value })}
                />
              </label>
              <label className="collection-item-fields-editor__field">
                <span className="collection-item-fields-editor__label">类型</span>
                <ShopSelect
                  value={
                    normalizeCollectionItemFieldValueType(activeField.valueType) ??
                    activeField.valueType
                  }
                  disabled={disabled}
                  onChange={(value) =>
                    updateAt(
                      safeIndex,
                      (() => {
                        const nextType = String(value) as BindingCollectionField["valueType"];
                        if (nextType === activeField.valueType) return {};
                        if (nextType === "collection") return emptyField("collection");
                        return {
                          valueType: nextType,
                          itemFields: undefined,
                          minItems: undefined,
                          maxItems: undefined,
                          dataSource: undefined,
                        };
                      })()
                    )
                  }
                >
                  {VALUE_TYPES.map((vt) => (
                    <ShopSelect.Option key={vt} value={vt}>
                      {collectionItemFieldValueTypeLabel(vt)}
                    </ShopSelect.Option>
                  ))}
                </ShopSelect>
              </label>
              {activeField.valueType === "collection" ? (
                <>
                  <label className="collection-item-fields-editor__field">
                    <span className="collection-item-fields-editor__label">子列表最少项数</span>
                    <ShopInput
                      type="number"
                      value={String(activeField.minItems ?? 1)}
                      placeholder="1"
                      disabled={disabled}
                      onChange={(e) =>
                        updateAt(safeIndex, {
                          minItems: Number.isFinite(Number(e.target.value))
                            ? Math.max(0, Number(e.target.value))
                            : 1,
                        })
                      }
                    />
                  </label>
                  <label className="collection-item-fields-editor__field">
                    <span className="collection-item-fields-editor__label">子列表最多项数</span>
                    <ShopInput
                      type="number"
                      value={String(activeField.maxItems ?? activeField.minItems ?? 1)}
                      placeholder="1"
                      disabled={disabled}
                      onChange={(e) =>
                        updateAt(safeIndex, {
                          maxItems: Number.isFinite(Number(e.target.value))
                            ? Math.max(1, Number(e.target.value))
                            : 1,
                        })
                      }
                    />
                  </label>
                  <div className="collection-item-fields-editor__field">
                    <span className="collection-item-fields-editor__label">子列表字段</span>
                    <CollectionItemFieldsEditor
                      itemFields={activeField.itemFields ?? []}
                      disabled={disabled}
                      onChange={(next) => updateAt(safeIndex, { itemFields: next })}
                    />
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      )}
      <div className="collection-item-fields-editor__actions">
        <ShopSecondaryButton htmlType="button" disabled={disabled} onClick={addField}>
          添加字段
        </ShopSecondaryButton>
        {itemFields.length > 0 ? (
          <span className="inspector__muted collection-item-fields-editor__count">
            共 {itemFields.length} 个字段，通过上方 Tab 切换编辑
          </span>
        ) : null}
      </div>
    </div>
  );
}
