import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { RepeatPreviewModel } from "../../repeat-binding-contract";
import type { EmailTemplate } from "../../types/email";
import type { TokenPresets } from "../../types/tokenPreset";
import type { BlockMaster, SectionMaster } from "../../types/master";
import {
  CANVAS_DRAG_INSERT_DATA_TYPE,
  type CanvasDragInsertPayload,
  decodeCanvasDropSlotId,
  insertDraggedBlockAtPreviewSlot,
  insertDraggedSectionAtPreviewSlot,
  canShowCanvasDropSlotAtPreviewIndex,
  canShowCanvasDropSlotForMove,
  moveBlockToPreviewSlot,
} from "../../lib/canvasDragInsert";
import { BLOCK_CATALOG_ENTRIES } from "../../lib/blockDefaults";
import { createCanvasInsertCollisionDetection } from "../../lib/canvasInsertSlotMeasure";
import { CanvasDragInsertProvider } from "./CanvasDragInsertContext";
import { CanvasDragGhost } from "./CanvasDragPaletteItem";
import { CanvasInsertDropLayer } from "./CanvasInsertDropLayer";
import { CanvasInsertSlot } from "./CanvasInsertSlot";

type Props = {
  enabled: boolean;
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  tokenPresets: TokenPresets | null;
  blockMastersById: Readonly<Record<string, BlockMaster>>;
  sectionMastersById: Readonly<Record<string, SectionMaster>>;
  onTemplateChange: (template: EmailTemplate) => void;
  onInserted: (args: { insertedBlockId: string; label: string }) => void;
  onMoved?: (args: { blockId: string; label: string }) => void;
  onError: (message: string) => void;
  children: ReactNode;
};

export function CanvasDragInsertRoot({
  enabled,
  sourceTemplate,
  previewModel,
  tokenPresets,
  blockMastersById,
  sectionMastersById,
  onTemplateChange,
  onInserted,
  onMoved,
  onError,
  children,
}: Props) {
  const [activePayload, setActivePayload] = useState<CanvasDragInsertPayload | null>(null);
  const [activeOverSlotId, setActiveOverSlotId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const clearDragState = useCallback(() => {
    setActivePayload(null);
    setActiveOverSlotId(null);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type !== CANVAS_DRAG_INSERT_DATA_TYPE) return;
    setActivePayload(data.payload as CanvasDragInsertPayload);
    setActiveOverSlotId(null);
  }, []);

  const moveBlockId = activePayload?.kind === "move" ? activePayload.blockId : null;

  // 唯一真源：碰撞检测解析出的 `over` 同时驱动「占位条显示」与「松手落地」，
  // 二者读同一个值，永不分叉（不再用 origin+delta 重算指针，避免滚动时偏移）。
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const over = event.over;
    if (over && over.data.current?.type === CANVAS_DRAG_INSERT_DATA_TYPE) {
      setActiveOverSlotId(String(over.id));
    } else {
      setActiveOverSlotId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const payload = event.active.data.current?.payload as CanvasDragInsertPayload | undefined;
      const over = event.over;
      const hoverSlotId = activeOverSlotId;
      clearDragState();
      if (!payload) return;

      const overData = over?.data.current;
      let slot =
        over && overData?.type === CANVAS_DRAG_INSERT_DATA_TYPE
          ? decodeCanvasDropSlotId(String(over.id))
          : null;
      if (!slot && hoverSlotId) {
        slot = decodeCanvasDropSlotId(hoverSlotId);
      }
      if (!slot) return;

      try {
        if (payload.kind === "move") {
          const next = moveBlockToPreviewSlot({
            sourceTemplate,
            previewModel,
            blockId: payload.blockId,
            parentPreviewBlockId: slot.parentPreviewBlockId,
            insertIndex: slot.insertIndex,
          });
          onTemplateChange(next);
          onMoved?.({ blockId: payload.blockId, label: payload.label });
          return;
        }

        if (payload.kind === "block") {
          const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.masterId === payload.masterId);
          if (!entry) throw new Error("组件不存在");
          const result = insertDraggedBlockAtPreviewSlot({
            sourceTemplate,
            previewModel,
            parentPreviewBlockId: slot.parentPreviewBlockId,
            insertIndex: slot.insertIndex,
            entry,
            tokenPresets,
            blockMastersById,
          });
          onTemplateChange(result.template);
          onInserted({ insertedBlockId: result.insertedBlockId, label: payload.label });
          return;
        }

        const section = sectionMastersById[payload.masterId];
        if (!section) throw new Error("模块不存在或已删除");
        const result = insertDraggedSectionAtPreviewSlot({
          sourceTemplate,
          previewModel,
          parentPreviewBlockId: slot.parentPreviewBlockId,
          insertIndex: slot.insertIndex,
          section,
          tokenPresets,
        });
        onTemplateChange(result.template);
        onInserted({ insertedBlockId: result.insertedBlockId, label: payload.label });
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      }
    },
    [
      blockMastersById,
      clearDragState,
      activeOverSlotId,
      onError,
      onInserted,
      onMoved,
      onTemplateChange,
      previewModel,
      sectionMastersById,
      sourceTemplate,
      tokenPresets,
    ]
  );

  const handleDragCancel = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const renderInsertSlot = useCallback(
    (parentPreviewBlockId: string, insertIndex: number, variant: "bar" | "column") => {
      if (!enabled || !activePayload || !activeOverSlotId) return null;
      const activeSlot = decodeCanvasDropSlotId(activeOverSlotId);
      if (
        !activeSlot ||
        activeSlot.parentPreviewBlockId !== parentPreviewBlockId ||
        activeSlot.insertIndex !== insertIndex
      ) {
        return null;
      }
      const slotAllowed =
        activePayload.kind === "move"
          ? canShowCanvasDropSlotForMove(
              sourceTemplate,
              previewModel,
              activePayload.blockId,
              parentPreviewBlockId,
              insertIndex
            )
          : canShowCanvasDropSlotAtPreviewIndex(
              sourceTemplate,
              previewModel,
              parentPreviewBlockId,
              insertIndex
            );
      if (!slotAllowed) {
        return null;
      }
      return (
        <CanvasInsertSlot
          parentPreviewBlockId={parentPreviewBlockId}
          insertIndex={insertIndex}
          variant={variant}
        />
      );
    },
    [activeOverSlotId, activePayload, enabled, previewModel, sourceTemplate]
  );

  const collisionDetection = useMemo(
    () => createCanvasInsertCollisionDetection(sourceTemplate, previewModel, moveBlockId),
    [moveBlockId, previewModel, sourceTemplate]
  );

  const contextValue = useMemo(
    () => ({
      enabled,
      isDragging: activePayload !== null,
      activePayload,
      activeOverSlotId,
      sourceTemplate,
      previewModel,
      renderInsertSlot,
    }),
    [activeOverSlotId, activePayload, enabled, previewModel, renderInsertSlot, sourceTemplate]
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <CanvasDragInsertProvider value={contextValue}>{children}</CanvasDragInsertProvider>
      <CanvasInsertDropLayer
        isDragging={activePayload !== null}
        activeOverSlotId={activeOverSlotId}
        moveBlockId={moveBlockId}
        sourceTemplate={sourceTemplate}
        previewModel={previewModel}
      />
      <DragOverlay dropAnimation={null}>
        {activePayload ? <CanvasDragGhost label={activePayload.label} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
