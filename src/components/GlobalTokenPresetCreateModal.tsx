import { useEffect, useState } from "react";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

type Props = {
  visible: boolean;
  creating?: boolean;
  onCancel: () => void;
  onCreate: (displayLabel: string) => Promise<void>;
};

export function GlobalTokenPresetCreateModal({
  visible,
  creating,
  onCancel,
  onCreate,
}: Props) {
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
      setDraftError("预设名称不能为空");
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
      title="新建公共样式预设"
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
        <span className="inspector-field__label">预设名称</span>
        <ShopInput
          autoFocus
          value={draftName}
          maxLength={80}
          placeholder="例如：公共·品牌蓝"
          onChange={(e) => setDraftName(e.target.value)}
          onPressEnter={() => void submit()}
        />
        <span className="topbar__create-hint">
          将使用内置默认颜色/间距/字号/圆角创建文件；技术 id 由名称自动推导（public- 前缀），保存至
          data/token-presets/。
        </span>
        {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
      </div>
    </ShopSectionModal>
  );
}
