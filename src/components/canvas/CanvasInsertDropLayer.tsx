import { useDroppable } from "@dnd-kit/core";
import { useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { RepeatPreviewModel } from "../../repeat-binding-contract";
import type { EmailTemplate } from "../../types/email";
import {
  CANVAS_DRAG_INSERT_DATA_TYPE,
  encodeCanvasDropSlotId,
  canShowCanvasDropSlotForMove,
} from "../../lib/canvasDragInsert";
import {
  collectPreviewInsertSlotDescriptors,
  measureInsertSlotRect,
  type CanvasLocalRect,
  type PreviewInsertSlotDescriptor,
} from "../../lib/canvasInsertSlotMeasure";

type MeasuredSlot = PreviewInsertSlotDescriptor & {
  slotId: string;
  rect: CanvasLocalRect;
};

type HitZoneProps = MeasuredSlot;

function CanvasInsertDropHitZone({
  slotId,
  parentPreviewBlockId,
  insertIndex,
  rect,
}: HitZoneProps) {
  const { setNodeRef } = useDroppable({
    id: slotId,
    data: {
      type: CANVAS_DRAG_INSERT_DATA_TYPE,
      parentPreviewBlockId,
      insertIndex,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="canvas-insert-drop-hit"
      style={{
        position: "absolute",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "auto",
      }}
      aria-hidden
    />
  );
}

type Props = {
  isDragging: boolean;
  /** 内联占位插入后布局会变，用于在占位撑开后再同步浮层命中区 */
  activeOverSlotId: string | null;
  moveBlockId: string | null;
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
};

export function CanvasInsertDropLayer({
  isDragging,
  activeOverSlotId,
  moveBlockId,
  sourceTemplate,
  previewModel,
}: Props) {
  const [layoutEpoch, setLayoutEpoch] = useState(0);

  useLayoutEffect(() => {
    if (!isDragging) return;
    const bump = () => setLayoutEpoch((n) => n + 1);
    bump();
    window.addEventListener("scroll", bump, true);
    window.addEventListener("resize", bump);
    return () => {
      window.removeEventListener("scroll", bump, true);
      window.removeEventListener("resize", bump);
    };
  }, [isDragging, sourceTemplate, previewModel]);

  /** 内联占位撑高布局后再测一次命中区，避免与 sticky 悬停判定打架 */
  useLayoutEffect(() => {
    if (!isDragging || !activeOverSlotId) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setLayoutEpoch((n) => n + 1));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeOverSlotId, isDragging]);

  const canvasHost =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(".email-preview-canvas-workspace")
      : null;

  const measuredSlots = useMemo((): MeasuredSlot[] => {
    if (!isDragging || !canvasHost) return [];
    void layoutEpoch;
    const canvasRect = canvasHost.getBoundingClientRect();
    return collectPreviewInsertSlotDescriptors(sourceTemplate, previewModel)
      .filter((descriptor) => {
        if (!moveBlockId) return true;
        return canShowCanvasDropSlotForMove(
          sourceTemplate,
          previewModel,
          moveBlockId,
          descriptor.parentPreviewBlockId,
          descriptor.insertIndex
        );
      })
      .map((descriptor) => {
        const rect = measureInsertSlotRect(descriptor, sourceTemplate, previewModel, canvasRect);
        if (!rect) return null;
        return {
          ...descriptor,
          slotId: encodeCanvasDropSlotId(descriptor.parentPreviewBlockId, descriptor.insertIndex),
          rect,
        };
      })
      .filter((slot): slot is MeasuredSlot => slot != null);
  }, [canvasHost, isDragging, layoutEpoch, moveBlockId, previewModel, sourceTemplate]);

  if (!isDragging || !canvasHost) return null;

  return createPortal(
    <div className="canvas-insert-drop-layer" aria-hidden>
      {measuredSlots.map((slot) => (
        <CanvasInsertDropHitZone key={slot.slotId} {...slot} />
      ))}
    </div>,
    canvasHost
  );
}
