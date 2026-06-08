import { useEffect, useRef, useState } from "react";
import type { BlockCatalogEntry } from "../../lib/blockDefaults";
import type { SectionCatalogItem } from "../../lib/sectionCatalog";
import {
  ShopDangerButton,
  ShopInput,
  ShopPrimaryButton,
  ShopSecondaryButton,
} from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

export type InsertModalTab = "blocks" | "sections";

/** 与 PRD §8.5 一致的展示顺序（非字母序，便于运营扫读）。 */
const BLOCK_INSERT_UI_ORDER: readonly string[] = [
  "action.button",
  "separator.divider",
  "indicator.progress",
  "layout.grid",
  "content.icon",
  "content.image",
  "content.text",
  "layout.container",
];

const BLOCK_TYPE_SHORT: Record<string, string> = {
  "action.button": "按钮",
  "separator.divider": "分割",
  "indicator.progress": "进度",
  "layout.grid": "栅格",
  "content.icon": "图标",
  "content.image": "图片",
  "content.text": "文本",
  "layout.container": "容器",
};

type Props = {
  visible: boolean;
  title: string;
  entries: BlockCatalogEntry[];
  sections: SectionCatalogItem[];
  busy?: boolean;
  onCancel: () => void;
  onPick: (entry: BlockCatalogEntry) => void;
  onPickSection: (masterId: string) => void;
  onRenameSection: (masterId: string, name: string) => Promise<void>;
  onDeleteSection: (masterId: string) => Promise<void>;
};

function SectionModuleRow({
  item,
  disabled,
  onPick,
  onRenameSection,
  onDeleteSection,
}: {
  item: SectionCatalogItem;
  disabled?: boolean;
  onPick: () => void;
  onRenameSection: (masterId: string, name: string) => Promise<void>;
  onDeleteSection: (masterId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setNameDraft(item.name);
      setRenameError(null);
    }
  }, [item.name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const rowDisabled = disabled || renaming || deleting;

  const startEdit = () => {
    if (rowDisabled || deleteConfirm) return;
    setNameDraft(item.name);
    setRenameError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNameDraft(item.name);
    setRenameError(null);
  };

  const submitRename = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setRenameError("名称不能为空");
      return;
    }
    if (trimmed === item.name) {
      cancelEdit();
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      await onRenameSection(item.masterId, trimmed);
      setEditing(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "重命名失败");
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteSection(item.masterId);
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const deleteConfirmMessage = `确定从模块库移除「${item.name}」？将逻辑删除该模块（masterId 保留），无法再从库中插入；当前邮件里已插入的实例不受影响。`;

  if (deleteConfirm) {
    return (
      <li
        className="canvas-insert-modal__module-row canvas-insert-modal__module-row--delete"
        aria-live="polite"
      >
        <p className="canvas-insert-modal__module-delete-text">{deleteConfirmMessage}</p>
        <div className="canvas-insert-modal__module-delete-actions shop-action-button-group">
          <ShopSecondaryButton disabled={deleting} onClick={() => setDeleteConfirm(false)}>
            取消
          </ShopSecondaryButton>
          <ShopDangerButton
            disabled={deleting}
            loading={deleting}
            onClick={() => void confirmDelete()}
          >
            删除
          </ShopDangerButton>
        </div>
      </li>
    );
  }

  return (
    <li
      className={
        editing
          ? "canvas-insert-modal__module-row canvas-insert-modal__module-row--editing"
          : "canvas-insert-modal__module-row"
      }
    >
      {editing ? (
        <div className="canvas-insert-modal__module-edit">
          <label className="canvas-insert-modal__module-edit-label" htmlFor={`section-name-${item.masterId}`}>
            模块名称
          </label>
          <ShopInput
            id={`section-name-${item.masterId}`}
            ref={inputRef}
            value={nameDraft}
            maxLength={80}
            disabled={renaming}
            onChange={(e) => {
              setNameDraft(e.target.value);
              if (renameError) setRenameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
          />
          {renameError ? (
            <span className="canvas-insert-modal__module-edit-error">{renameError}</span>
          ) : null}
          <div className="canvas-insert-modal__module-edit-actions shop-action-button-group">
            <ShopSecondaryButton disabled={renaming} onClick={cancelEdit}>
              取消
            </ShopSecondaryButton>
            <ShopPrimaryButton
              disabled={renaming}
              loading={renaming}
              onClick={() => void submitRename()}
            >
              保存
            </ShopPrimaryButton>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="canvas-insert-modal__module-main"
            disabled={rowDisabled}
            onClick={onPick}
          >
            <span
              className="canvas-insert-modal__module-name"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startEdit();
              }}
            >
              {item.name}
            </span>
            <span className="canvas-insert-modal__module-meta">{item.blockCount} 个区块</span>
          </button>
          <div className="canvas-insert-modal__module-ops shop-action-button-group">
            <ShopPrimaryButton
              disabled={rowDisabled}
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
            >
              重命名
            </ShopPrimaryButton>
            <ShopDangerButton
              disabled={rowDisabled}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(true);
              }}
            >
              删除
            </ShopDangerButton>
          </div>
        </>
      )}
    </li>
  );
}

export function CanvasInsertBlockModal({
  visible,
  title,
  entries,
  sections,
  busy,
  onCancel,
  onPick,
  onPickSection,
  onRenameSection,
  onDeleteSection,
}: Props) {
  const [tab, setTab] = useState<InsertModalTab>("blocks");

  useEffect(() => {
    if (visible) setTab("blocks");
  }, [visible]);

  const sortedBlocks = [...entries].sort((a, b) => {
    const order = new Map(BLOCK_INSERT_UI_ORDER.map((id, i) => [id, i]));
    const ai = order.get(a.masterId) ?? 99;
    const bi = order.get(b.masterId) ?? 99;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  const sortedSections = [...sections].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN")
  );

  if (!visible) return null;

  return (
    <ShopSectionModal
      visible
      title={title}
      width={560}
      wrapClassName="canvas-insert-modal-wrap shop-section-modal-wrap"
      onCancel={onCancel}
      maskClosable={!busy}
      closable={!busy}
      destroyOnClose
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={onCancel} disabled={busy}>
            取消
          </ShopSecondaryButton>
        </div>
      }
    >
      <div className={`canvas-insert-modal${busy ? " canvas-insert-modal--busy" : ""}`}>
        <p className="canvas-insert-modal__hint">选择一项即可插入；插入后可在右侧配置面板继续调整。</p>

        <div className="canvas-insert-modal__segment" role="tablist" aria-label="插入来源">
          <button
            type="button"
            role="tab"
            className={
              tab === "blocks"
                ? "canvas-insert-modal__segment-item canvas-insert-modal__segment-item--active"
                : "canvas-insert-modal__segment-item"
            }
            disabled={busy}
            aria-selected={tab === "blocks"}
            onClick={() => setTab("blocks")}
          >
            基础组件
          </button>
          <button
            type="button"
            role="tab"
            className={
              tab === "sections"
                ? "canvas-insert-modal__segment-item canvas-insert-modal__segment-item--active"
                : "canvas-insert-modal__segment-item"
            }
            disabled={busy}
            aria-selected={tab === "sections"}
            onClick={() => setTab("sections")}
          >
            我的模块
            {sortedSections.length > 0 ? (
              <span className="canvas-insert-modal__segment-badge">{sortedSections.length}</span>
            ) : null}
          </button>
        </div>

        <div className="canvas-insert-modal__panel" role="tabpanel">
          {tab === "blocks" ? (
            <ul className="canvas-insert-modal__tile-grid">
              {sortedBlocks.map((entry) => (
                <li key={entry.masterId}>
                  <button
                    type="button"
                    className="canvas-insert-modal__tile"
                    disabled={busy}
                    onClick={() => onPick(entry)}
                  >
                    <span className="canvas-insert-modal__tile-tag">
                      {BLOCK_TYPE_SHORT[entry.masterId] ?? "组件"}
                    </span>
                    <span className="canvas-insert-modal__tile-name">{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : sortedSections.length === 0 ? (
            <div className="canvas-insert-modal__empty">
              <p className="canvas-insert-modal__empty-title">暂无已存模块</p>
              <p className="canvas-insert-modal__empty-desc">
                在画布选中<strong>布局容器</strong>、<strong>栅格</strong>或<strong>图片（叠放外壳）</strong>
                后，点击「存为模块」即可保存当前组合。
              </p>
            </div>
          ) : (
            <ul className="canvas-insert-modal__module-list">
              {sortedSections.map((item) => (
                <SectionModuleRow
                  key={item.masterId}
                  item={item}
                  disabled={busy}
                  onPick={() => onPickSection(item.masterId)}
                  onRenameSection={onRenameSection}
                  onDeleteSection={onDeleteSection}
                />
              ))}
            </ul>
          )}
        </div>

        {busy ? (
          <div className="canvas-insert-modal__busy" aria-live="polite">
            正在插入…
          </div>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
