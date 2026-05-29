import { useEffect, useState } from "react";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type EmailTemplateCreateModalProps = {
  visible: boolean;
  creating?: boolean;
  onCancel: () => void;
  onCreate: (displayName: string) => Promise<void>;
};

export function EmailTemplateCreateModal({
  visible,
  creating,
  onCancel,
  onCreate,
}: EmailTemplateCreateModalProps) {
  const [draftName, setDraftName] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftName("");
    setDraftError(null);
  }, [visible]);

  const close = () => {
    if (creating) return;
    onCancel();
  };

  const submit = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("模板名称不能为空");
      return;
    }
    setDraftError(null);
    try {
      await onCreate(normalized);
    } catch {
      setDraftError("创建失败，请稍后重试");
    }
  };

  if (!visible) return null;

  return (
    <ShopSectionModal
      visible
      title="创建新模板"
      onCancel={close}
      maskClosable={!creating}
      closable={!creating}
      destroyOnClose
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={close} disabled={creating}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton onClick={() => void submit()} loading={creating}>
            创建
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="inspector-field">
        <span className="inspector-field__label">模板名称</span>
        <ShopInput
          autoFocus
          value={draftName}
          maxLength={80}
          placeholder="请输入模板名称"
          onChange={(e) => setDraftName(e.target.value)}
          onPressEnter={() => void submit()}
        />
        <span className="topbar__create-hint">
          将自动在 data/emails 下创建场景目录；标识（emailKey）由名称推导，纯中文名称会使用自动编号。
        </span>
        {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
      </div>
    </ShopSectionModal>
  );
}
