import { useEffect, useState } from "react";
import type { BindingCollectionField } from "../types/email";
import { CollectionItemFieldsTableEditor } from "./CollectionItemFieldsTableEditor";
import { ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

export type ObjectItemFieldsModalProps = {
  visible: boolean;
  slotId: string;
  slotLabel?: string;
  objectFields: BindingCollectionField[];
  onClose: () => void;
};

/** 对象变量字段目录：只读查看，与列表「行字段」弹窗同构。 */
export function ObjectItemFieldsModal({
  visible,
  slotId,
  slotLabel,
  objectFields,
  onClose,
}: ObjectItemFieldsModalProps) {
  const [draft, setDraft] = useState(objectFields);

  useEffect(() => {
    if (!visible) return;
    setDraft(objectFields);
  }, [objectFields, visible]);

  const displayLabel = slotLabel?.trim() || slotId;

  return (
    <ShopSectionModal
      title="对象字段"
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
            关闭
          </ShopSecondaryButton>
        </div>
      }
    >
      <div className="collection-item-fields-modal">
        <p className="collection-item-fields-modal__hint">
          对象变量 <code>{slotId}</code>
          {displayLabel !== slotId ? <>（{displayLabel}）</> : null}
          ：声明该对象包含哪些字段；内置结构为只读，接入方按对象形态写入 values。
        </p>
        <CollectionItemFieldsTableEditor itemFields={draft} disabled onChange={setDraft} />
      </div>
    </ShopSectionModal>
  );
}
