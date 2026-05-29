import { useCallback, useMemo, useState } from "react";
import type { LayoutManifest } from "../../layout-variant-contract/types";
import { logicalDeleteConfirmOptions } from "../../lib/logicalDeleteConfirm";
import { sortVisibleLayoutVariantsByCreatedDesc } from "../../lib/layoutVariantLogicalDelete";
import { useConfirmDialog } from "./ConfirmDialogProvider";
import { resolveShopSelectStringValue } from "../../lib/shopSelectValue";
import { TopbarResourceField } from "./TopbarResourceField";
import { ResourceSelectDropdownFooter } from "./ResourceSelectDropdownFooter";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type TopbarLayoutVariantSelectProps = {
  manifest: LayoutManifest | null;
  value: string | null;
  disabled?: boolean;
  busy?: boolean;
  /** legacy 单文件存储：尚无 layout-manifest，仅允许「新建」以启用多版式 */
  legacySingleFile?: boolean;
  onSelect: (layoutVariantId: string) => void;
  onCreate: (label: string) => Promise<void>;
  onRename: (label: string) => Promise<void>;
  onDelete?: () => Promise<void>;
};

/** 场景级版式切换（大结构变体） */
export function TopbarLayoutVariantSelect({
  manifest,
  value,
  disabled,
  busy,
  legacySingleFile,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: TopbarLayoutVariantSelectProps) {
  const { confirm } = useConfirmDialog();
  const [selectOpen, setSelectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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

  const canDeleteLayout = options.length > 1 && Boolean(currentVariant) && !legacySingleFile;

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

  const closeCreate = () => {
    if (busy) return;
    setCreateOpen(false);
    setDraftError(null);
  };

  const openCreate = () => {
    setDraftName("");
    setDraftError(null);
    setCreateOpen(true);
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
        title: "逻辑删除版式",
        resourcePhrase: `版式「${currentVariant.label}」`,
        fileHint: "layout-manifest.json 中对应 variants 项的 deletedAt",
      })
    );
    if (ok) void onDelete();
  };

  const submitCreate = async () => {
    const normalized = draftName.trim();
    if (!normalized) {
      setDraftError("版式名称不能为空");
      return;
    }
    setDraftError(null);
    try {
      await onCreate(normalized);
      setCreateOpen(false);
    } catch {
      setDraftError("创建失败，请稍后重试");
    }
  };

  if (!manifest && !legacySingleFile) return null;

  const selectDisabled = disabled || busy || legacySingleFile;
  const selectValue = legacySingleFile
    ? "__legacy__"
    : (value ?? manifest?.activeLayoutVariantId);

  const resourceActions = [
    {
      id: "create",
      label: "新建",
      disabled: disabled || busy,
      onClick: openCreate,
    },
    {
      id: "rename",
      label: "重命名",
      disabled: disabled || busy || !currentVariant || legacySingleFile,
      onClick: openRename,
    },
    {
      id: "delete",
      label: "删除",
      danger: true,
      disabled: disabled || busy || !canDeleteLayout || !onDelete,
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
          popupMatchSelectWidth
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
          {legacySingleFile ? (
            <ShopSelect.Option value="__legacy__">默认（单文件存储）</ShopSelect.Option>
          ) : (
            options.map((v) => (
              <ShopSelect.Option key={v.id} value={v.id}>
                {v.label?.trim() || v.id}
              </ShopSelect.Option>
            ))
          )}
        </ShopSelect>
      </TopbarResourceField>

      {createOpen ? (
        <ShopSectionModal
          visible
          title="新建版式结构"
          onCancel={closeCreate}
          maskClosable={!busy}
          closable={!busy}
          destroyOnClose
          footer={
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={closeCreate} disabled={busy}>
                取消
              </ShopSecondaryButton>
              <ShopPrimaryButton onClick={() => void submitCreate()} loading={busy}>
                创建
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
              placeholder="例如：居中流式版"
              onChange={(e) => setDraftName(e.target.value)}
              onPressEnter={() => void submitCreate()}
            />
            <span className="topbar__create-hint">
              将复制当前版式的 template 与 tokenPresets 到新目录 layouts/&lt;id&gt;/；单文件场景会先迁移为
              default 版式再创建新版式。
            </span>
            {draftError ? <span className="topbar__rename-error">{draftError}</span> : null}
          </div>
        </ShopSectionModal>
      ) : null}

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
