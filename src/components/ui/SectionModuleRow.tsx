import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { SectionCatalogItem } from "../../lib/sectionCatalog";
import type { InputRef } from "./ShopFormControls";
import {
  ShopDangerButton,
  ShopInput,
  ShopPrimaryButton,
  ShopSecondaryButton,
} from "./ShopFormControls";

type Props = {
  item: SectionCatalogItem;
  disabled?: boolean;
  /** 嵌套在自定义列表项内时用 embedded（外层由父级提供 li） */
  variant?: "list-item" | "embedded";
  /** 不传则名称不可点击插入，仍支持双击重命名 */
  onPick?: () => void;
  onRenameSection: (masterId: string, name: string) => Promise<void>;
  onDeleteSection: (masterId: string) => Promise<void>;
  /** 外层可拖拽时，在按钮/输入等交互区阻止 pointer 冒泡以免误触拖拽 */
  preventDragOnInteractive?: boolean;
};

export function SectionModuleRow({
  item,
  disabled,
  variant = "list-item",
  onPick,
  onRenameSection,
  onDeleteSection,
  preventDragOnInteractive = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<InputRef>(null);

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

  const blockDragPointer = preventDragOnInteractive
    ? (e: PointerEvent<HTMLElement>) => {
        e.stopPropagation();
      }
    : undefined;

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
  const RowTag = variant === "embedded" ? "div" : "li";

  if (deleteConfirm) {
    return (
      <RowTag
        className="section-module-row section-module-row--delete"
        {...(variant === "embedded" ? { role: "listitem" as const } : {})}
        onPointerDown={blockDragPointer}
        aria-live="polite"
      >
        <p className="section-module-row__delete-text">{deleteConfirmMessage}</p>
        <div className="section-module-row__delete-actions shop-action-button-group">
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
      </RowTag>
    );
  }

  return (
    <RowTag
      className={editing ? "section-module-row section-module-row--editing" : "section-module-row"}
      {...(variant === "embedded" ? { role: "listitem" as const } : {})}
    >
      {editing ? (
        <div
          className="section-module-row__main section-module-row__main--edit"
          onPointerDown={blockDragPointer}
        >
          <ShopInput
            id={`section-name-${item.masterId}`}
            ref={inputRef}
            className="section-module-row__inline-input"
            value={nameDraft}
            maxLength={80}
            disabled={renaming}
            status={renameError ? "error" : undefined}
            title={renameError ?? undefined}
            aria-label="模块名称"
            aria-invalid={renameError ? true : undefined}
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
        </div>
      ) : onPick ? (
        <button
          type="button"
          className="section-module-row__main"
          disabled={rowDisabled}
          onClick={onPick}
        >
          <span
            className="section-module-row__name"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startEdit();
            }}
          >
            {item.name}
          </span>
        </button>
      ) : (
        <div className="section-module-row__main section-module-row__main--static">
          <span
            className="section-module-row__name"
            onDoubleClick={(e) => {
              e.preventDefault();
              startEdit();
            }}
          >
            {item.name}
          </span>
        </div>
      )}

      <div
        className="section-module-row__ops shop-action-button-group"
        onPointerDown={blockDragPointer}
      >
        {editing ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </RowTag>
  );
}
