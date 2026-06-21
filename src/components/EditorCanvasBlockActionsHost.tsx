import { memo, useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import {
  computeCanvasBlockActionLayout,
  escapePreviewBlockIdForSelector,
  pickCanvasBlockActionHorizontalAnchorRect,
  type CanvasBlockActionLayout,
} from "../lib/canvasBlockActionLayout";
import { useCanvasSelectedBlockModel } from "../hooks/useCanvasSelectedBlockModel";
import { CanvasDragPaletteItem } from "./canvas/CanvasDragPaletteItem";
import { ShopSecondaryButton } from "./ui/ShopFormControls";
import type { InsertBlockMode } from "../lib/templateBlockInsert";

type Props = {
  template: EmailTemplate | null;
  previewModel: RepeatPreviewModel | null;
  canvasScrollRef: RefObject<HTMLDivElement | null>;
  canvasStageRef: RefObject<HTMLDivElement | null>;
  canvasPreviewViewportPx: number;
  canvasRootConfiguredWidthPx: number;
  canvasActionsBusy: boolean;
  onOpenInsertModal: (mode: InsertBlockMode) => void;
  onOpenSaveSectionModal: () => void;
  onDeleteSelectedBlock: () => void | Promise<void>;
  onMoveSelectedBlock: (direction: "up" | "down") => void;
  onDuplicateSelectedBlock: () => void;
};

/**
 * 画布区块操作浮层订阅层：选中态变化仅重渲染本组件，不牵动 App 根。
 */
export const EditorCanvasBlockActionsHost = memo(function EditorCanvasBlockActionsHost({
  template,
  previewModel,
  canvasScrollRef,
  canvasStageRef,
  canvasPreviewViewportPx,
  canvasRootConfiguredWidthPx,
  canvasActionsBusy,
  onOpenInsertModal,
  onOpenSaveSectionModal,
  onDeleteSelectedBlock,
  onMoveSelectedBlock,
  onDuplicateSelectedBlock,
}: Props) {
  const selection = useCanvasSelectedBlockModel(template, previewModel);
  const [layout, setLayout] = useState<CanvasBlockActionLayout | null>(null);
  const selectedCanvasBlockKey = selection.selectedCanvasBlockKey;

  useLayoutEffect(() => {
    if (!previewModel || !selectedCanvasBlockKey || !selection.showCanvasBlockActions) {
      setLayout(null);
      return;
    }

    const previewRootId = previewModel.root.block.id;

    const updateLayout = () => {
      const stage = canvasStageRef.current;
      const scroll = canvasScrollRef.current;
      if (!stage || !scroll) {
        setLayout(null);
        return;
      }
      const rootEl = scroll.querySelector<HTMLElement>(
        `[data-email-preview-block="${escapePreviewBlockIdForSelector(previewRootId)}"]`
      );
      const selectedEl = scroll.querySelector<HTMLElement>(
        `[data-email-preview-block="${escapePreviewBlockIdForSelector(selectedCanvasBlockKey)}"]`
      );
      if (!rootEl || !selectedEl) {
        setLayout(null);
        return;
      }
      const viewportEl = scroll.querySelector<HTMLElement>(".email-preview-viewport");
      const horizontalAnchorRect = pickCanvasBlockActionHorizontalAnchorRect({
        previewViewportPx: canvasPreviewViewportPx,
        rootConfiguredWidthPx: canvasRootConfiguredWidthPx,
        previewRootRect: rootEl.getBoundingClientRect(),
        previewViewportRect: viewportEl?.getBoundingClientRect() ?? null,
      });
      const next = computeCanvasBlockActionLayout({
        stageRect: stage.getBoundingClientRect(),
        horizontalAnchorRect,
        selectedBlockRect: selectedEl.getBoundingClientRect(),
        insertButtonCount: selection.canvasLeftActionButtonCount,
        deleteButtonCount: selection.canvasDeleteActionButtonCount,
      });
      setLayout((prev) => {
        if (
          prev &&
          prev.insert.top === next.insert.top &&
          prev.insert.verticalAlign === next.insert.verticalAlign &&
          prev.delete.top === next.delete.top &&
          prev.delete.verticalAlign === next.delete.verticalAlign &&
          prev.insertLeft === next.insertLeft &&
          prev.deleteLeft === next.deleteLeft
        ) {
          return prev;
        }
        return next;
      });
    };

    updateLayout();
    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateLayout();
      });
    };
    const scroll = canvasScrollRef.current;
    scroll?.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      scroll?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [
    previewModel,
    selectedCanvasBlockKey,
    selection.showCanvasBlockActions,
    selection.canvasLeftActionButtonCount,
    selection.canvasDeleteActionButtonCount,
    canvasScrollRef,
    canvasStageRef,
    canvasPreviewViewportPx,
    canvasRootConfiguredWidthPx,
  ]);

  if (!previewModel || !selection.showCanvasBlockActions || !layout) {
    return null;
  }

  return createPortal(
    <div className="canvas-block-actions" aria-label="画布区块操作">
      {selection.showCanvasLeftActions ? (
        <div
          className="canvas-block-actions__insert"
          style={
            {
              top: `${layout.insert.top}px`,
              left: `${layout.insertLeft}px`,
            } as CSSProperties
          }
        >
          {selection.selectedCanDragMove && selection.selectedPhysicalBlockId ? (
            <CanvasDragPaletteItem
              payload={{
                kind: "move",
                blockId: selection.selectedPhysicalBlockId,
                label: selection.selectedCanvasBlockLabel,
              }}
              activatorOnly
            >
              <ShopSecondaryButton
                className="canvas-insert-actions__btn"
                disabled={canvasActionsBusy}
                title="拖到目标插入位置后松开以移动（含跨父级）"
              >
                拖拽移动
              </ShopSecondaryButton>
            </CanvasDragPaletteItem>
          ) : null}
          {selection.siblingMoveState ? (
            <>
              <ShopSecondaryButton
                className="canvas-insert-actions__btn"
                disabled={canvasActionsBusy || !selection.siblingMoveState.canMoveUp}
                title="在父级 children 中上移一位"
                onClick={() => onMoveSelectedBlock("up")}
              >
                上移
              </ShopSecondaryButton>
              <ShopSecondaryButton
                className="canvas-insert-actions__btn"
                disabled={canvasActionsBusy || !selection.siblingMoveState.canMoveDown}
                title="在父级 children 中下移一位"
                onClick={() => onMoveSelectedBlock("down")}
              >
                下移
              </ShopSecondaryButton>
            </>
          ) : null}
          {selection.selectedCanDuplicate ? (
            <ShopSecondaryButton
              className="canvas-insert-actions__btn"
              disabled={canvasActionsBusy}
              title="在当前区块下方复制整块子树（含样式与变量绑定）"
              onClick={onDuplicateSelectedBlock}
            >
              复制
            </ShopSecondaryButton>
          ) : null}
          {selection.selectedSupportsChildInsert ? (
            <ShopSecondaryButton
              className="canvas-insert-actions__btn"
              disabled={canvasActionsBusy}
              onClick={() => onOpenInsertModal("child")}
            >
              插入子级
            </ShopSecondaryButton>
          ) : null}
          {selection.selectedSupportsBelowInsert ? (
            <ShopSecondaryButton
              className="canvas-insert-actions__btn"
              disabled={canvasActionsBusy}
              title="在当前区块后插入同级区块"
              onClick={() => onOpenInsertModal("below")}
            >
              下方插入
            </ShopSecondaryButton>
          ) : null}
          {selection.selectedCanSaveAsSection ? (
            <ShopSecondaryButton
              className="canvas-insert-actions__btn"
              disabled={canvasActionsBusy}
              title="将当前容器及其子级保存为可复用模块"
              onClick={onOpenSaveSectionModal}
            >
              存为模块
            </ShopSecondaryButton>
          ) : null}
        </div>
      ) : null}
      {selection.selectedCanDelete ? (
        <div
          className="canvas-block-actions__delete"
          style={
            {
              top: `${layout.delete.top}px`,
              left: `${layout.deleteLeft}px`,
            } as CSSProperties
          }
        >
          <ShopSecondaryButton
            className="canvas-delete-actions__btn"
            disabled={canvasActionsBusy}
            title="删除当前区块（含子级）"
            onClick={() => void onDeleteSelectedBlock()}
          >
            删除
          </ShopSecondaryButton>
        </div>
      ) : null}
    </div>,
    document.body
  );
});
