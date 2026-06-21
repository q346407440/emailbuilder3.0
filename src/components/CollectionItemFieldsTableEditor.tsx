import { useEffect, useMemo, useState } from "react";
import type { BindingCollectionField } from "../types/email";
import { canDeclareCollectionItemFieldType } from "../payload-contract/collection-item-fields";
import {
  collectionItemFieldTypesForPicker,
  collectionItemFieldValueTypeLabel,
} from "../payload-contract/collection-item-fields";
import { normalizeCollectionItemFieldValueType } from "../payload-contract/value-types";
import {
  appendCollectionItemField,
  canRemoveCollectionItemField,
  defaultExpandedPathKeys,
  flattenCollectionItemFields,
  pathKey,
  removeCollectionItemField,
  setCollectionItemFieldType,
  updateCollectionItemField,
} from "../lib/collectionItemFieldsTree";
import { DeleteOutlined } from "@ant-design/icons";
import { ShopInput, ShopSecondaryButton, ShopSelect } from "./ui/ShopFormControls";

const VALUE_TYPES = collectionItemFieldTypesForPicker();

type Props = {
  itemFields: BindingCollectionField[];
  disabled?: boolean;
  onChange: (next: BindingCollectionField[]) => void;
};

export function CollectionItemFieldsTableEditor({ itemFields, disabled, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpandedPathKeys(itemFields));

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const key of defaultExpandedPathKeys(itemFields)) next.add(key);
      return next;
    });
  }, [itemFields]);

  const rows = useMemo(
    () => flattenCollectionItemFields(itemFields, expanded),
    [expanded, itemFields]
  );

  const toggleExpanded = (pathKeyValue: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pathKeyValue)) next.delete(pathKeyValue);
      else next.add(pathKeyValue);
      return next;
    });
  };

  return (
    <div className="collection-item-fields-table">
      <div className="collection-item-fields-table__head" role="row">
        <span className="collection-item-fields-table__th collection-item-fields-table__th--tree" />
        <span className="collection-item-fields-table__th collection-item-fields-table__th--label">
          变量名
        </span>
        <span
          className="collection-item-fields-table__th collection-item-fields-table__th--key"
          title="字段的唯一标识，用于与模板内容绑定"
        >
          key
        </span>
        <span className="collection-item-fields-table__th collection-item-fields-table__th--type">
          变量类型
        </span>
        <span className="collection-item-fields-table__th collection-item-fields-table__th--add">
          <span className="collection-item-fields-table__sr-only">添加子字段</span>
        </span>
        <span className="collection-item-fields-table__th collection-item-fields-table__th--delete">
          <span className="collection-item-fields-table__sr-only">删除</span>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="inspector__muted collection-item-fields-table__empty">
          尚未定义行字段。请点击下方「添加字段」开始配置。
        </p>
      ) : (
        <div className="collection-item-fields-table__body" role="tree">
          {rows.map(({ path, depth, field }) => {
            const pk = pathKey(path);
            const isCollection = field.valueType === "collection";
            const isExpanded = isCollection && expanded.has(pk);
            const hasChildren = isCollection && (field.itemFields?.length ?? 0) > 0;
            const canPickCollectionType = canDeclareCollectionItemFieldType(depth);

            return (
              <div
                key={pk}
                className="collection-item-fields-table__row"
                role="treeitem"
                aria-expanded={isCollection ? isExpanded : undefined}
                style={{ ["--row-depth" as string]: String(depth) }}
              >
                <div className="collection-item-fields-table__tree-cell">
                  {isCollection ? (
                    <button
                      type="button"
                      className="collection-item-fields-table__expand"
                      disabled={disabled}
                      aria-label={isExpanded ? "折叠子字段" : "展开子字段"}
                      onClick={() => toggleExpanded(pk)}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  ) : (
                    <span className="collection-item-fields-table__expand-placeholder" aria-hidden />
                  )}
                </div>

                <div className="collection-item-fields-table__label-cell">
                  <ShopInput
                    value={field.label}
                    placeholder="例如：商品图"
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(updateCollectionItemField(itemFields, path, { label: e.target.value }))
                    }
                  />
                </div>

                <div className="collection-item-fields-table__key-cell">
                  <ShopInput
                    value={field.key}
                    placeholder="例如：imageSrc"
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(updateCollectionItemField(itemFields, path, { key: e.target.value }))
                    }
                  />
                </div>

                <div className="collection-item-fields-table__type-cell">
                  <ShopSelect
                    value={
                      normalizeCollectionItemFieldValueType(field.valueType) ?? field.valueType
                    }
                    disabled={disabled}
                    onChange={(value) =>
                      onChange(
                        setCollectionItemFieldType(
                          itemFields,
                          path,
                          String(value) as BindingCollectionField["valueType"],
                          depth
                        )
                      )
                    }
                  >
                    {VALUE_TYPES.map((vt) => {
                      const isCollectionOption = vt === "collection";
                      const optionDisabled =
                        disabled || (isCollectionOption && !canPickCollectionType);
                      return (
                        <ShopSelect.Option
                          key={vt}
                          value={vt}
                          disabled={optionDisabled}
                          title={
                            optionDisabled && isCollectionOption
                              ? "最多支持 2 级列表，子列表内不能再选子列表类型"
                              : undefined
                          }
                        >
                          {collectionItemFieldValueTypeLabel(vt)}
                        </ShopSelect.Option>
                      );
                    })}
                  </ShopSelect>
                </div>

                <div className="collection-item-fields-table__add-cell">
                  {isCollection ? (
                    <button
                      type="button"
                      className="collection-item-fields-table__icon-btn"
                      disabled={disabled}
                      title="添加子字段"
                      aria-label="添加子字段"
                      onClick={() => onChange(appendCollectionItemField(itemFields, path))}
                    >
                      ⊕
                    </button>
                  ) : (
                    <span className="collection-item-fields-table__add-placeholder" aria-hidden />
                  )}
                </div>

                <div className="collection-item-fields-table__delete-cell">
                  <button
                    type="button"
                    className="collection-item-fields-table__delete-btn"
                    disabled={disabled || !canRemoveCollectionItemField(itemFields, path)}
                    title={
                      canRemoveCollectionItemField(itemFields, path)
                        ? "删除字段"
                        : "至少保留一个字段"
                    }
                    aria-label="删除字段"
                    onClick={() => onChange(removeCollectionItemField(itemFields, path))}
                  >
                    <DeleteOutlined aria-hidden />
                  </button>
                </div>

                {isCollection && isExpanded && !hasChildren ? (
                  <p className="collection-item-fields-table__nested-hint inspector__muted">
                    子列表暂无字段，请点击右侧 ⊕ 添加。
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="collection-item-fields-table__footer">
        <ShopSecondaryButton
          htmlType="button"
          disabled={disabled}
          onClick={() => onChange(appendCollectionItemField(itemFields, null))}
        >
          添加字段
        </ShopSecondaryButton>
        {itemFields.length > 0 ? (
          <span className="inspector__muted">共 {itemFields.length} 个顶层字段，子列表可展开编辑</span>
        ) : null}
      </div>
    </div>
  );
}
