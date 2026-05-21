import { useEffect, useMemo, useState } from "react";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import {
  collectionItemFieldValueTypeLabel,
  formatCollectionFirstItemFieldExample,
} from "../lib/repeatListItemField";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

export type RepeatListItemFieldPickerModalProps = {
  visible: boolean;
  collectionLabel: string;
  slotId: string;
  payload: EmailPayload;
  itemFields: BindingCollectionField[];
  currentFieldKey: string;
  onClose: () => void;
  onConfirm: (fieldKey: string) => void;
};

export function RepeatListItemFieldPickerModal({
  visible,
  collectionLabel,
  slotId,
  payload,
  itemFields,
  currentFieldKey,
  onClose,
  onConfirm,
}: RepeatListItemFieldPickerModalProps) {
  const [selectedKey, setSelectedKey] = useState(currentFieldKey);

  useEffect(() => {
    if (!visible) return;
    setSelectedKey(
      itemFields.some((f) => f.key === currentFieldKey) ? currentFieldKey : (itemFields[0]?.key ?? "")
    );
  }, [currentFieldKey, itemFields, visible]);

  const previewField = itemFields.find((f) => f.key === selectedKey) ?? itemFields[0];
  const firstItemExample = useMemo(() => {
    if (!previewField) return "—";
    return formatCollectionFirstItemFieldExample(payload, slotId, previewField.key);
  }, [previewField, payload, slotId]);

  const previewFieldLabel = previewField?.label?.trim() || previewField?.key || "—";

  return (
    <ShopSectionModal
      title="切换列表字段映射"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="text-body-inline-var-modal-wrap text-body-var-pill-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton
            htmlType="button"
            disabled={!selectedKey}
            onClick={() => onConfirm(selectedKey)}
          >
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <ListItemFieldPickerBody
        collectionLabel={collectionLabel}
        slotId={slotId}
        itemFields={itemFields}
        payload={payload}
        selectedKey={selectedKey}
        onSelectKey={setSelectedKey}
        firstItemExample={firstItemExample}
        previewFieldLabel={previewFieldLabel}
      />
    </ShopSectionModal>
  );
}

function ListItemFieldPickerBody({
  collectionLabel,
  slotId,
  itemFields,
  payload,
  selectedKey,
  onSelectKey,
  firstItemExample,
  previewFieldLabel,
}: {
  collectionLabel: string;
  slotId: string;
  itemFields: BindingCollectionField[];
  payload: EmailPayload;
  selectedKey: string;
  onSelectKey: (key: string) => void;
  firstItemExample: string;
  previewFieldLabel: string;
}) {
  return (
    <div className="text-body-inline-var-modal">
      <p className="text-body-var-pill-modal__hint">
        列表变量 <code>{slotId}</code>（{collectionLabel}）的项字段；仅可改映射到本输入框的字段，不能切换为其他列表或字面量。
      </p>

      <div
        className={
          firstItemExample !== "—"
            ? "shop-section-modal__selection-banner"
            : "shop-section-modal__selection-banner shop-section-modal__selection-banner--placeholder"
        }
        title={firstItemExample !== "—" ? firstItemExample : undefined}
      >
        {firstItemExample !== "—" ? (
          <>
            首项示例（列表第 1 项 · {previewFieldLabel}）：{firstItemExample}
          </>
        ) : (
          <>首项示例（列表第 1 项）：暂无数据</>
        )}
      </div>

      {itemFields.length === 0 ? (
        <p className="text-body-var-pill-modal__empty">当前列表未声明可映射的项字段。</p>
      ) : (
        <>
          <p className="text-body-var-pill-modal__hint">
            在下方表格中单选一项字段后点「确定」。「首项示例」列取自 payload 列表第 1 项。
          </p>
          <div
            className="text-body-var-pill-modal__table-wrap"
            role="radiogroup"
            aria-label="可选列表项字段"
          >
            <table className="text-body-var-pill-modal__table">
              <thead>
                <tr>
                  <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--radio" scope="col">
                    <span className="text-body-var-pill-modal__sr-only">选择</span>
                  </th>
                  <th className="text-body-var-pill-modal__th" scope="col">
                    名称
                  </th>
                  <th className="text-body-var-pill-modal__th" scope="col">
                    标识
                  </th>
                  <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--type" scope="col">
                    类型
                  </th>
                  <th className="text-body-var-pill-modal__th" scope="col">
                    首项示例
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemFields.map((field) => {
                  const selected = field.key === selectedKey;
                  const exampleValue = formatCollectionFirstItemFieldExample(payload, slotId, field.key);
                  return (
                    <tr
                      key={field.key}
                      className={`text-body-var-pill-modal__row${selected ? " text-body-var-pill-modal__row--selected" : ""}`}
                      onClick={() => onSelectKey(field.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectKey(field.key);
                        }
                      }}
                      tabIndex={0}
                      role="radio"
                      aria-checked={selected}
                    >
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                        <input
                          type="radio"
                          name="repeat-list-item-field-picker"
                          className="text-body-var-pill-modal__radio"
                          checked={selected}
                          onChange={() => onSelectKey(field.key)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`选择 ${field.label ?? field.key}`}
                        />
                      </td>
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                        {field.label || field.key}
                      </td>
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                        <code>{field.key}</code>
                      </td>
                      <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                        {collectionItemFieldValueTypeLabel(field.valueType)}
                      </td>
                      <td
                        className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                        title={exampleValue}
                      >
                        {exampleValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
