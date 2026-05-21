import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  mapPlacementAlignment,
  mapPlacementDirection,
  resolveHorizontalAlignment,
  resolveVerticalDirection,
  type FloatingPlacement,
  type HorizontalAlignment,
} from "../lib/floatingPlacement";

type UseAdaptiveOverlayPlacementOptions = {
  triggerRef: RefObject<HTMLElement>;
  preferredPlacement?: FloatingPlacement;
  estimatedPopupHeight?: number;
  estimatedPopupWidth?: number;
  minViewportPadding?: number;
  overlayClassName?: string;
  onVisibleChange?: (visible: boolean) => void;
};

type UseAdaptiveOverlayPlacementResult = {
  open: boolean;
  placement: FloatingPlacement;
  overlayClassName: string;
  onVisibleChange: (visible: boolean) => void;
  refreshPlacement: () => void;
};

function createOverlayMarker(): string {
  return `adaptive-overlay-${Math.random().toString(36).slice(2, 10)}`;
}

/** 通用浮层方向自适应：可复用于下拉、hover 浮层、弹出面板等场景。 */
export function useAdaptiveOverlayPlacement({
  triggerRef,
  preferredPlacement = "topLeft",
  estimatedPopupHeight = 320,
  estimatedPopupWidth = 260,
  minViewportPadding = 8,
  overlayClassName,
  onVisibleChange,
}: UseAdaptiveOverlayPlacementOptions): UseAdaptiveOverlayPlacementResult {
  const markerRef = useRef(createOverlayMarker());
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<FloatingPlacement>(preferredPlacement);

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

  const refreshPlacement = useCallback(() => {
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
    const preferredDirection = preferredPlacement.startsWith("bottom") ? "bottom" : "top";
    const preferredAlignment: HorizontalAlignment = preferredPlacement.endsWith("Right")
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
    const withDirection = mapPlacementDirection(preferredPlacement, nextDirection);
    setPlacement(mapPlacementAlignment(withDirection, nextAlignment));
  }, [minViewportPadding, preferredPlacement, resolvePopupSize, triggerRef]);

  const handleVisibleChange = useCallback(
    (visible: boolean) => {
      setOpen(visible);
      if (visible) {
        refreshPlacement();
        requestAnimationFrame(refreshPlacement);
      }
      onVisibleChange?.(visible);
    },
    [onVisibleChange, refreshPlacement]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const recalc = () => refreshPlacement();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open, refreshPlacement]);

  return {
    open,
    placement,
    overlayClassName: mergedOverlayClassName,
    onVisibleChange: handleVisibleChange,
    refreshPlacement,
  };
}
