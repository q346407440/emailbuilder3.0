import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  mapOverlayEdgeAlignment,
  mapOverlayEdgeDirection,
  resolveHorizontalAlignment,
  resolveVerticalDirection,
  type FloatingOverlayEdge,
  type HorizontalAlignment,
} from "../lib/floatingOverlayEdge";

type UseAdaptiveOverlayEdgeOptions = {
  triggerRef: RefObject<HTMLElement>;
  preferredEdge?: FloatingOverlayEdge;
  estimatedPopupHeight?: number;
  estimatedPopupWidth?: number;
  minViewportPadding?: number;
  overlayClassName?: string;
  onVisibleChange?: (visible: boolean) => void;
};

type UseAdaptiveOverlayEdgeResult = {
  open: boolean;
  overlayEdge: FloatingOverlayEdge;
  overlayClassName: string;
  onVisibleChange: (visible: boolean) => void;
  refreshOverlayEdge: () => void;
};

function createOverlayMarker(): string {
  return `adaptive-overlay-${Math.random().toString(36).slice(2, 10)}`;
}

/** 通用浮层方向自适应：可复用于下拉、hover 浮层、弹出面板等场景。 */
export function useAdaptiveOverlayEdge({
  triggerRef,
  preferredEdge = "topLeft",
  estimatedPopupHeight = 320,
  estimatedPopupWidth = 260,
  minViewportPadding = 8,
  overlayClassName,
  onVisibleChange,
}: UseAdaptiveOverlayEdgeOptions): UseAdaptiveOverlayEdgeResult {
  const markerRef = useRef(createOverlayMarker());
  const [open, setOpen] = useState(false);
  const [overlayEdge, setOverlayEdge] = useState<FloatingOverlayEdge>(preferredEdge);

  const mergedOverlayClassName = useMemo(() => {
    return overlayClassName ? `${overlayClassName} ${markerRef.current}` : markerRef.current;
  }, [overlayClassName]);

  const resolvePopupSize = useCallback((): { height: number; width: number } => {
    const popupEl = document.querySelector<HTMLElement>(`.${markerRef.current}`);
    if (!popupEl) {
      return { height: estimatedPopupHeight, width: estimatedPopupWidth };
    }
    const rect = popupEl.getBoundingClientRect();
    return {
      height: rect.height > 0 ? rect.height : estimatedPopupHeight,
      width: rect.width > 0 ? rect.width : estimatedPopupWidth,
    };
  }, [estimatedPopupHeight, estimatedPopupWidth]);

  const refreshOverlayEdge = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) {
      return;
    }
    const rect = triggerEl.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.right;
    const spaceRight = window.innerWidth - rect.left;
    const { height: popupHeight, width: popupWidth } = resolvePopupSize();
    const preferredDirection = preferredEdge.startsWith("bottom") ? "bottom" : "top";
    const preferredAlignment: HorizontalAlignment = preferredEdge.endsWith("Right")
      ? "right"
      : "left";
    const nextDirection = resolveVerticalDirection({
      spaceAbove,
      spaceBelow,
      popupHeight,
      preferredDirection,
      minViewportPadding,
    });
    const nextAlignment = resolveHorizontalAlignment({
      spaceLeft,
      spaceRight,
      popupWidth,
      preferredAlignment,
      minViewportPadding,
    });
    const withDirection = mapOverlayEdgeDirection(preferredEdge, nextDirection);
    setOverlayEdge(mapOverlayEdgeAlignment(withDirection, nextAlignment));
  }, [minViewportPadding, preferredEdge, resolvePopupSize, triggerRef]);

  const handleVisibleChange = useCallback(
    (visible: boolean) => {
      setOpen(visible);
      if (visible) {
        refreshOverlayEdge();
        requestAnimationFrame(refreshOverlayEdge);
      }
      onVisibleChange?.(visible);
    },
    [onVisibleChange, refreshOverlayEdge]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const recalc = () => refreshOverlayEdge();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open, refreshOverlayEdge]);

  return {
    open,
    overlayEdge,
    overlayClassName: mergedOverlayClassName,
    onVisibleChange: handleVisibleChange,
    refreshOverlayEdge,
  };
}
