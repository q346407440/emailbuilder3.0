import { useCallback, useMemo, useState } from "react";
import type { EmailListItem } from "../../types/email";
import { isPublishedPublishStatus, type PublishStatus } from "../../publish-status-contract";
import { normalizePublishStatus } from "../../lib/emailPublishStatus";
import { logicalDeleteConfirmOptions } from "../../lib/logicalDeleteConfirm";
import { resolveShopSelectStringValue } from "../../lib/shopSelectValue";
import { useConfirmDialog } from "./ConfirmDialogProvider";
import { TopbarResourceField } from "./TopbarResourceField";
import { TOPBAR_RESOURCE_DROPDOWN_STYLE } from "./topbarResourceSelectLayout";
import { ResourceSelectDropdownFooter } from "./ResourceSelectDropdownFooter";
import { ResourceSelectOptionLabel } from "./ResourceSelectOptionLabel";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type TopbarTemplateSelectProps = {
  items: EmailListItem[];
  value: string | null;
  disabled?: boolean;
  busy?: boolean;
  renaming?: boolean;
  creating?: boolean;
  onSelect: (emailKey: string) => void;
  onRename: (displayName: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  deleting?: boolean;
  onOpenCreate?: () => void;
  onOpenCopy?: () => void;
  onSetPublishStatus?: (status: PublishStatus) => Promise<void>;
};

export function TopbarTemplateSelect({
  items,
  value,
  disabled,
  busy,
  renaming,
  creating,
  onSelect,
  onRename,
  onDelete,
  deleting,
  onOpenCreate,
  onOpenCopy,
  onSetPublishStatus,
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

  const templatePublished =
    currentItem !== null && isPublishedPublishStatus(normalizePublishStatus(currentItem.publishStatus));

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
        kind: "emailTemplate",
        name: currentItem.displayName,
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

  const selectDisabled = disabled || busy;
  const actionBusy = busy || creating || deleting || renaming;

  const resourceActions = [
    {
      id: "create",
      label: "新建",
      disabled: selectDisabled || creating || !onOpenCreate,
      onClick: () => onOpenCreate?.(),
    },
    {
      id: "copy",
      label: "复制",
      disabled: selectDisabled || creating || !currentItem || !onOpenCopy,
      onClick: () => onOpenCopy?.(),
    },
    {
      id: "rename",
      label: "重命名",
      disabled: selectDisabled || !currentItem || actionBusy,
      onClick: openRename,
    },
    ...(onSetPublishStatus
      ? [
          templatePublished
            ? {
                id: "unpublish",
                label: "撤回发布",
                disabled: selectDisabled || actionBusy || !currentItem,
                onClick: () => void onSetPublishStatus("draft"),
              }
            : {
                id: "publish",
                label: "发布模板",
                disabled: selectDisabled || actionBusy || !currentItem,
                onClick: () => void onSetPublishStatus("published"),
              },
        ]
      : []),
    {
      id: "delete",
      label: "删除",
      danger: true,
      disabled: selectDisabled || !currentItem || !onDelete || actionBusy,
      onClick: () => void confirmDelete(),
    },
  ];

  return (
    <>
      <TopbarResourceField label="邮件模板" variant="email-template">
        <ShopSelect
          className="topbar__select"
          value={value ?? undefined}
          placeholder={items.length ? undefined : "暂无模板"}
          disabled={selectDisabled}
          open={selectOpen}
          onDropdownVisibleChange={setSelectOpen}
          popupMatchSelectWidth={false}
          dropdownStyle={TOPBAR_RESOURCE_DROPDOWN_STYLE}
          getPopupContainer={() => document.body}
          dropdownRender={(menu) => (
            <ResourceSelectDropdownFooter
              menu={menu}
              actions={resourceActions}
              actionsAriaLabel="邮件模板操作"
              busy={actionBusy}
              onAfterAction={() => setSelectOpen(false)}
            />
          )}
          onChange={handleTemplatePick}
        >
          {items.map((it) => {
            const published = isPublishedPublishStatus(normalizePublishStatus(it.publishStatus));
            const label = it.displayName?.trim() || it.emailKey;
            return (
              <ShopSelect.Option key={it.emailKey} value={it.emailKey}>
                <ResourceSelectOptionLabel label={label} published={published} />
              </ShopSelect.Option>
            );
          })}
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
