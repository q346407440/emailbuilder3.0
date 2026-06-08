import { useEffect, useState } from "react";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type Props = {
  visible: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
};

export function SaveSectionModal({ visible, saving, onCancel, onSave }: Props) {
  const [draftName, setDraftName] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftName("");
    setDraftError(null);
  }, [visible]);

  const close = () => {
    if (saving) return;
    onCancel();
  };

  const submit = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("模块名称不能为空");
      return;
    }
    setDraftError(null);
    try {
      await onSave(normalized);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "保存失败");
    }
  };

  if (!visible) return null;

  return (
    <ShopSectionModal
      visible
      title="存为模块"
      onCancel={close}
      maskClosable={!saving}
      closable={!saving}
      destroyOnClose
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={close} disabled={saving}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton onClick={() => void submit()} loading={saving}>
            保存
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="inspector-field">
        <span className="inspector-field__label">模块名称</span>
        <ShopInput
          autoFocus
          value={draftName}
          maxLength={80}
          placeholder="例如：双列商品卡"
          onChange={(e) => setDraftName(e.target.value)}
          onPressEnter={() => void submit()}
        />
        <span className="topbar__create-hint">
          将保存当前容器及其全部子级为可复用模块；不含列表循环绑定。已插入邮件中的实例不受影响。
        </span>
        {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
      </div>
    </ShopSectionModal>
  );
}
