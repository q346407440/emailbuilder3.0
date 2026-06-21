import { useEffect, useMemo, useState } from "react";
import type { BindingCollectionField, EmailPayload } from "../types/email";
import {
  collectionItemFieldValueTypeLabel,
  formatCollectionFirstItemFieldExample,
} from "../lib/repeatListItemField";
import { Field } from "./ui/Field";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { SelectablePickerTable } from "./ui/SelectablePickerTable";
import { ShopSectionModal } from "./ui/ShopSectionModal";

const EMPTY_MESSAGE = "当前列表未声明可映射的项字段。";

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
      wrapClassName="text-body-var-pill-modal-wrap shop-section-modal-wrap--picker"
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
    <div className="text-body-var-pill-modal">
      <p className="text-body-var-pill-modal__hint">
        列表「{collectionLabel}」的字段：在此选择本输入框要显示的字段，不可切换为其他列表或固定内容。
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

      <Field label="选择字段" className="inspector-field--modal-table">
        <p className="text-body-var-pill-modal__hint">
          在下方表格中选择一个字段后点「确定」。「首项示例」列取自列表的第一条数据。
        </p>
        <SelectablePickerTable
          ariaLabel="可选列表项字段"
          rowKey={(field) => field.key}
          selectedKey={selectedKey}
          onSelect={onSelectKey}
          radioName="repeat-list-item-field-picker"
          dataSource={itemFields}
          emptyText={<p className="text-body-var-pill-modal__empty">{EMPTY_MESSAGE}</p>}
          columns={[
            {
              key: "label",
              title: "名称",
              render: (field) => field.label || field.key,
            },
            {
              key: "id",
              title: "标识",
              render: (field) => <code className="selectable-picker-table__mono">{field.key}</code>,
            },
            {
              key: "type",
              title: "类型",
              width: 72,
              render: (field) => collectionItemFieldValueTypeLabel(field.valueType),
            },
            {
              key: "value",
              title: "首项示例",
              ellipsis: true,
              render: (field) => {
                const exampleValue = formatCollectionFirstItemFieldExample(payload, slotId, field.key);
                return <span title={exampleValue}>{exampleValue}</span>;
              },
            },
          ]}
        />
      </Field>
    </div>
  );
}
