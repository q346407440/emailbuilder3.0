import { memo, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { VirtualBlockRef } from "../../repeat-binding-contract";
import {
  measureCanvasSelectionOverlayRects,
  type CanvasSelectionOverlayRect,
} from "../../lib/canvasSelectionOverlay";

type Props = {
  scopeRef: RefObject<HTMLElement | null>;
  selectedBlockRef: VirtualBlockRef | null;
  refIndex: ReadonlyMap<string, VirtualBlockRef>;
  rootBlockId: string;
  rootSelectionOnViewport: boolean;
  /** 选中变化时递增，供画布工具条等同帧重测 */
  measureNonce?: number;
};

function rectsEqual(a: CanvasSelectionOverlayRect[], b: CanvasSelectionOverlayRect[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.key !== y.key ||
      x.top !== y.top ||
      x.left !== y.left ||
      x.width !== y.width ||
      x.height !== y.height
    ) {
      return false;
    }
  }
  return true;
}

/**
 * 画布选中描边 overlay：选中变化时仅更新本层，不触发 BlockView 整树重渲染。
 */
export const CanvasSelectionOverlay = memo(function CanvasSelectionOverlay({
  scopeRef,
  selectedBlockRef,
  refIndex,
  rootBlockId,
  rootSelectionOnViewport,
  measureNonce = 0,
}: Props) {
  const [rects, setRects] = useState<CanvasSelectionOverlayRect[]>([]);

  useLayoutEffect(() => {
    const scopeEl = scopeRef.current;
    if (!scopeEl || !selectedBlockRef) {
      setRects((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const measure = () => {
      const scope = scopeRef.current;
      if (!scope) return;
      const next = measureCanvasSelectionOverlayRects({
        scopeEl: scope,
        selectedBlockRef,
        refIndex,
        rootBlockId,
        rootSelectionOnViewport,
      });
      setRects((prev) => (rectsEqual(prev, next) ? prev : next));
    };

    measure();

    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measure();
      });
    };

    const scrollEl = scopeEl.closest<HTMLElement>(".canvas-scroll");
    scrollEl?.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      scrollEl?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [
    scopeRef,
    selectedBlockRef,
    refIndex,
    rootBlockId,
    rootSelectionOnViewport,
    measureNonce,
  ]);

  if (rects.length === 0) return null;

  return createPortal(
    <div className="canvas-selection-overlay" aria-hidden>
      {rects.map((rect) => (
        <div
          key={rect.key}
          className="canvas-selection-overlay__ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}
    </div>,
    document.body
  );
});
