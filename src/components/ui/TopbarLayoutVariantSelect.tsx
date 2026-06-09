import { useCallback, useMemo, useState } from "react";
import type { AiStepUiState } from "../../layout-variant-ai-contract/progress";
import type { MjsGenerateMode } from "../../layout-variant-ai-contract/mjsGenerateMode";
import type { LayoutManifest } from "../../layout-variant-contract/types";
import { isPublishedPublishStatus, type PublishStatus } from "../../publish-status-contract";
import { normalizePublishStatus } from "../../lib/emailPublishStatus";
import { logicalDeleteConfirmOptions } from "../../lib/logicalDeleteConfirm";
import { sortVisibleLayoutVariantsByCreatedDesc } from "../../lib/layoutVariantLogicalDelete";
import { useConfirmDialog } from "./ConfirmDialogProvider";
import { resolveShopSelectStringValue } from "../../lib/shopSelectValue";
import { TopbarResourceField } from "./TopbarResourceField";
import { TOPBAR_RESOURCE_DROPDOWN_STYLE } from "./topbarResourceSelectLayout";
import { ResourceSelectDropdownFooter } from "./ResourceSelectDropdownFooter";
import { ResourceSelectOptionLabel } from "./ResourceSelectOptionLabel";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";
import {
  LayoutVariantCreateModal,
  type LayoutVariantCreateModalMode,
  type LayoutVariantCreateSubmit,
} from "./LayoutVariantCreateModal";

type TopbarLayoutVariantSelectProps = {
  manifest: LayoutManifest | null;
  value: string | null;
  disabled?: boolean;
  busy?: boolean;
  aiPipelineSteps?: AiStepUiState[] | null;
  onSelect: (layoutVariantId: string) => void;
  onCreate: (
    label: string,
    options?: {
      copyFromLayoutVariantId?: string;
      designImageFile?: File;
      mjsGenerateMode?: MjsGenerateMode;
    }
  ) => Promise<void>;
  /** 新建版式弹窗关闭时清理 AI 进度（如失败后点取消） */
  onCreateModalClosed?: () => void;
  onRename: (label: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSetPublishStatus?: (status: PublishStatus) => Promise<void>;
};

/** 场景级版式切换（大结构变体） */
export function TopbarLayoutVariantSelect({
  manifest,
  value,
  disabled,
  busy,
  aiPipelineSteps,
  onSelect,
  onCreate,
  onCreateModalClosed,
  onRename,
  onDelete,
  onSetPublishStatus,
}: TopbarLayoutVariantSelectProps) {
  const { confirm } = useConfirmDialog();
  const [selectOpen, setSelectOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<LayoutVariantCreateModalMode>("create");
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const options = useMemo(
    () => (manifest?.variants ? sortVisibleLayoutVariantsByCreatedDesc(manifest.variants) : []),
    [manifest]
  );

  const currentVariant = useMemo(() => {
    if (!manifest) return null;
    const activeId = value ?? manifest.activeLayoutVariantId;
    return options.find((v) => v.id === activeId) ?? options[0] ?? null;
  }, [manifest, options, value]);

  const copySourceLabel = currentVariant?.label?.trim() || currentVariant?.id;

  const canDeleteLayout = options.length > 1 && Boolean(currentVariant);
  const currentPublishStatus = currentVariant
    ? normalizePublishStatus(currentVariant.publishStatus)
    : null;
  const layoutPublished =
    currentPublishStatus !== null && isPublishedPublishStatus(currentPublishStatus);

  const handlePick = useCallback(
    (raw: unknown) => {
      const nextId = resolveShopSelectStringValue(raw);
      if (!nextId || nextId === value) return;
      onSelect(nextId);
    },
    [onSelect, value]
  );

  const openRename = () => {
    if (!currentVariant) return;
    setDraftName(currentVariant.label);
    setDraftError(null);
    setRenameOpen(true);
  };

  const closeRename = () => {
    if (busy) return;
    setRenameOpen(false);
    setDraftError(null);
  };

  const openCreateModal = (mode: LayoutVariantCreateModalMode) => {
    setCreateModalMode(mode);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (busy) return;
    setCreateModalOpen(false);
    onCreateModalClosed?.();
  };

  const submitRename = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("版式名称不能为空");
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

  const confirmDelete = async () => {
    if (!currentVariant || !onDelete || !canDeleteLayout) return;
    const ok = await confirm(
      logicalDeleteConfirmOptions({
        kind: "layoutVariant",
        name: currentVariant.label,
      })
    );
    if (ok) void onDelete();
  };

  const submitCreateModal = async (payload: LayoutVariantCreateSubmit) => {
    if (payload.kind === "copy") {
      await onCreate(
        payload.label,
        currentVariant ? { copyFromLayoutVariantId: currentVariant.id } : undefined
      );
    } else if (payload.kind === "ai") {
      await onCreate(payload.label, {
        designImageFile: payload.imageFile,
        mjsGenerateMode: payload.mjsGenerateMode,
      });
    } else {
      await onCreate(payload.label);
    }
    setCreateModalOpen(false);
  };

  if (!manifest) return null;

  const selectDisabled = disabled || busy;
  const selectValue = value ?? manifest.activeLayoutVariantId;

  const resourceActions = [
    {
      id: "create",
      label: "新建",
      disabled: selectDisabled,
      onClick: () => openCreateModal("create"),
    },
    {
      id: "copy",
      label: "复制",
      disabled: selectDisabled || !currentVariant,
      onClick: () => openCreateModal("copy"),
    },
    {
      id: "rename",
      label: "重命名",
      disabled: selectDisabled || !currentVariant,
      onClick: openRename,
    },
    ...(onSetPublishStatus
      ? [
          layoutPublished
            ? {
                id: "unpublish",
                label: "撤回发布",
                disabled: selectDisabled || !currentVariant,
                onClick: () => void onSetPublishStatus("draft"),
              }
            : {
                id: "publish",
                label: "发布版式",
                disabled: selectDisabled || !currentVariant,
                onClick: () => void onSetPublishStatus("published"),
              },
        ]
      : []),
    {
      id: "delete",
      label: "删除",
      danger: true,
      disabled: selectDisabled || !canDeleteLayout || !onDelete,
      onClick: () => void confirmDelete(),
    },
  ];

  return (
    <>
      <TopbarResourceField label="版式结构" variant="layout-variant">
        <ShopSelect
          className="topbar__select"
          disabled={selectDisabled}
          value={selectValue}
          open={selectOpen}
          onDropdownVisibleChange={setSelectOpen}
          popupMatchSelectWidth={false}
          dropdownStyle={TOPBAR_RESOURCE_DROPDOWN_STYLE}
          onChange={handlePick}
          placeholder="选择版式"
          getPopupContainer={() => document.body}
          dropdownRender={(menu) => (
            <ResourceSelectDropdownFooter
              menu={menu}
              actions={resourceActions}
              actionsAriaLabel="版式结构操作"
              busy={busy}
              onAfterAction={() => setSelectOpen(false)}
            />
          )}
        >
          {options.map((v) => {
            const published = isPublishedPublishStatus(normalizePublishStatus(v.publishStatus));
            const label = v.label?.trim() || v.id;
            return (
              <ShopSelect.Option key={v.id} value={v.id}>
                <ResourceSelectOptionLabel label={label} published={published} />
              </ShopSelect.Option>
            );
          })}
        </ShopSelect>
      </TopbarResourceField>

      <LayoutVariantCreateModal
        visible={createModalOpen}
        mode={createModalMode}
        copySourceLabel={createModalMode === "copy" ? copySourceLabel : undefined}
        busy={busy}
        aiPipelineSteps={aiPipelineSteps}
        onCancel={closeCreateModal}
        onSubmit={submitCreateModal}
      />

      {renameOpen ? (
        <ShopSectionModal
          visible
          title="重命名版式结构"
          onCancel={closeRename}
          maskClosable={!busy}
          closable={!busy}
          destroyOnClose
          footer={
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={closeRename} disabled={busy}>
                取消
              </ShopSecondaryButton>
              <ShopPrimaryButton onClick={() => void submitRename()} loading={busy}>
                保存
              </ShopPrimaryButton>
            </div>
          }
        >
          <div className="inspector-field">
            <span className="inspector-field__label">版式名称</span>
            <ShopInput
              autoFocus
              value={draftName}
              maxLength={80}
              placeholder="请输入版式名称"
              onChange={(e) => setDraftName(e.target.value)}
              onPressEnter={() => void submitRename()}
            />
            {currentVariant ? (
              <span className="topbar__create-hint">版式标识（id）保持为 {currentVariant.id}，仅修改展示名称。</span>
            ) : null}
            {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
          </div>
        </ShopSectionModal>
      ) : null}
    </>
  );
}
