import { useCallback, useMemo, useState } from "react";
import type { EmailListItem } from "../../types/email";
import { logicalDeleteConfirmOptions } from "../../lib/logicalDeleteConfirm";
import { resolveShopSelectStringValue } from "../../lib/shopSelectValue";
import { useConfirmDialog } from "./ConfirmDialogProvider";
import { TopbarResourceField } from "./TopbarResourceField";
import { ResourceSelectDropdownFooter } from "./ResourceSelectDropdownFooter";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type TopbarTemplateSelectProps = {
  items: EmailListItem[];
  value: string | null;
  disabled?: boolean;
  renaming?: boolean;
  creating?: boolean;
  onSelect: (emailKey: string) => void;
  onRename: (displayName: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleting?: boolean;
  onOpenCreate?: () => void;
};

export function TopbarTemplateSelect({
  items,
  value,
  disabled,
  renaming,
  creating,
  onSelect,
  onRename,
  onDelete,
  deleting,
  onOpenCreate,
}: TopbarTemplateSelectProps) {
  const { confirm } = useConfirmDialog();
  const [selectOpen, setSelectOpen] = useState(false);
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

  const confirmDelete = async () => {
    if (!currentItem || !onDelete) return;
    const ok = await confirm(
      logicalDeleteConfirmOptions({
        title: "逻辑删除邮件模板",
        resourcePhrase: `邮件模板「${currentItem.displayName}」`,
        fileHint: `data/emails/${currentItem.emailKey}/meta.json`,
      })
    );
    if (ok) void onDelete();
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

  const resourceActions = [
    {
      id: "create",
      label: "新建",
      disabled: disabled || creating || !onOpenCreate,
      onClick: () => onOpenCreate?.(),
    },
    {
      id: "rename",
      label: "重命名",
      disabled: disabled || !currentItem || creating || deleting,
      onClick: openRename,
    },
    {
      id: "delete",
      label: "删除",
      danger: true,
      disabled: disabled || !currentItem || !onDelete || creating || deleting,
      onClick: () => void confirmDelete(),
    },
  ];

  return (
    <>
      <TopbarResourceField label="邮件模板" variant="email-template">
        <ShopSelect
          value={value ?? undefined}
          placeholder={items.length ? undefined : "暂无模板"}
          disabled={disabled}
          open={selectOpen}
          onDropdownVisibleChange={setSelectOpen}
          popupMatchSelectWidth
          getPopupContainer={() => document.body}
          dropdownRender={(menu) => (
            <ResourceSelectDropdownFooter
              menu={menu}
              actions={resourceActions}
              actionsAriaLabel="邮件模板操作"
              busy={creating || deleting || renaming}
              onAfterAction={() => setSelectOpen(false)}
            />
          )}
          onChange={handleTemplatePick}
        >
          {items.map((it) => (
            <ShopSelect.Option key={it.emailKey} value={it.emailKey}>
              {it.displayName?.trim() || it.emailKey}
            </ShopSelect.Option>
          ))}
        </ShopSelect>
      </TopbarResourceField>

      {renameOpen ? (
        <ShopSectionModal
          visible
          title="重命名邮件模板"
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
                保存
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
