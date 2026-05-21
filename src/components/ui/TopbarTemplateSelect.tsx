import { useCallback, useMemo, useState } from "react";
import type { EmailListItem } from "../../types/email";
import { resolveShopSelectStringValue } from "../../lib/shopSelectValue";
import {
  ShopInput,
  ShopPrimaryButton,
  ShopSecondaryButton,
  ShopSelect,
} from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type TopbarTemplateSelectProps = {
  items: EmailListItem[];
  value: string | null;
  disabled?: boolean;
  renaming?: boolean;
  onSelect: (emailKey: string) => void;
  onRename: (displayName: string) => Promise<void>;
};

export function TopbarTemplateSelect({
  items,
  value,
  disabled,
  renaming,
  onSelect,
  onRename,
}: TopbarTemplateSelectProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const currentItem = useMemo(
    () => items.find((it) => it.emailKey === value) ?? null,
    [items, value]
  );

  const handleTemplatePick = useCallback(
    (raw: unknown) => {
      const nextKey = resolveShopSelectStringValue(raw);
      if (!nextKey || nextKey === value) return;
      onSelect(nextKey);
    },
    [onSelect, value]
  );

  const openRename = () => {
    if (!currentItem) return;
    setDraftName(currentItem.displayName);
    setDraftError(null);
    setRenameOpen(true);
  };

  const closeRename = () => {
    if (renaming) return;
    setRenameOpen(false);
    setDraftError(null);
  };

  const submitRename = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("模板名称不能为空");
      return;
    }
    setDraftError(null);
    try {
      await onRename(normalized);
      setRenameOpen(false);
    } catch {
      setDraftError("保存失败，请稍后重试");
    }
  };

  return (
    <>
      <div className="topbar__select-wrap">
        <span className="topbar__select-label">邮件模板</span>
        <div className="topbar__select-slot">
          <ShopSelect
            value={value ?? undefined}
            placeholder={items.length ? undefined : "暂无模板"}
            disabled={disabled}
            getPopupContainer={() => document.body}
            onChange={handleTemplatePick}
            onSelect={handleTemplatePick}
          >
            {items.map((it) => (
              <ShopSelect.Option key={it.emailKey} value={it.emailKey}>
                {it.displayName} ({it.emailKey})
              </ShopSelect.Option>
            ))}
          </ShopSelect>
        </div>
        <ShopSecondaryButton
          className="topbar__rename-btn"
          disabled={disabled || !currentItem}
          onClick={openRename}
        >
          编辑
        </ShopSecondaryButton>
      </div>

      {renameOpen ? (
        <ShopSectionModal
          visible
          title="编辑当前模板名称"
          onCancel={closeRename}
          maskClosable={!renaming}
          closable={!renaming}
          destroyOnClose
          footer={
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={closeRename} disabled={renaming}>
                取消
              </ShopSecondaryButton>
              <ShopPrimaryButton onClick={() => void submitRename()} loading={renaming}>
                保存名称
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
              onPressEnter={() => void submitRename()}
            />
            {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
          </div>
        </ShopSectionModal>
      ) : null}
    </>
  );
}
