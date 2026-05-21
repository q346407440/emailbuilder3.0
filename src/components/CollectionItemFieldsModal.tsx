import { useEffect, useState } from "react";
import { message } from "@shoplazza/sds";
import type { BindingCollectionField } from "../types/email";
import { normalizeCollectionItemFields } from "../payload-contract/collection-item-fields";
import { validateCollectionItemFields } from "../lib/collectionItemFieldsEdit";
import { CollectionItemFieldsTableEditor } from "./CollectionItemFieldsTableEditor";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

export type CollectionItemFieldsModalProps = {
  visible: boolean;
  slotId: string;
  slotLabel?: string;
  itemFields: BindingCollectionField[];
  disabled?: boolean;
  onClose: () => void;
  onApply: (itemFields: BindingCollectionField[]) => void;
};

export function CollectionItemFieldsModal({
  visible,
  slotId,
  slotLabel,
  itemFields,
  disabled,
  onClose,
  onApply,
}: CollectionItemFieldsModalProps) {
  const [draft, setDraft] = useState(itemFields);

  useEffect(() => {
    if (!visible) return;
    setDraft(itemFields);
  }, [itemFields, visible]);

  const handleApply = () => {
    const normalized = normalizeCollectionItemFields(draft);
    const err = validateCollectionItemFields(normalized);
    if (err) {
      message.error(err);
      return;
    }
    onApply(normalized);
    onClose();
  };

  const displayLabel = slotLabel?.trim() || slotId;

  return (
    <ShopSectionModal
      title="列表行字段配置"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="collection-item-fields-modal-wrap shop-section-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" disabled={disabled} onClick={handleApply}>
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="collection-item-fields-modal">
        <p className="collection-item-fields-modal__hint">
          列表变量 <code>{slotId}</code>
          {displayLabel !== slotId ? <>（{displayLabel}）</> : null}
          ：声明每一项包含哪些列（itemFields），写入 <code>payload.slots</code>。类型为「子列表」时可展开并添加子字段（如 SPU 下的 SKU 列表）。
        </p>
        <CollectionItemFieldsTableEditor
          itemFields={draft}
          disabled={disabled}
          onChange={setDraft}
        />
      </div>
    </ShopSectionModal>
  );
}
