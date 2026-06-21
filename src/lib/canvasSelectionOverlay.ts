import type { VirtualBlockRef } from "../repeat-binding-contract";
import { isRepeatExpansionGroupSelected } from "../repeat-runtime";
import { escapePreviewBlockIdForSelector } from "./canvasBlockActionLayout";

export type CanvasSelectionOverlayRect = {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

/** 选中 ref 在预览树中对应的所有 previewBlockId（含 repeat 展开组）。 */
export function collectSelectedPreviewBlockIds(
  selectedBlockRef: VirtualBlockRef | null,
  refIndex: ReadonlyMap<string, VirtualBlockRef>
): string[] {
  if (!selectedBlockRef) return [];
  const ids: string[] = [];
  for (const [blockId, ref] of refIndex) {
    if (isRepeatExpansionGroupSelected(selectedBlockRef, ref)) {
      ids.push(blockId);
    }
  }
  return ids;
}

export function isPreviewRootBlockSelected(
  selectedBlockRef: VirtualBlockRef | null,
  rootBlockId: string,
  refIndex: ReadonlyMap<string, VirtualBlockRef>
): boolean {
  if (!selectedBlockRef) return false;
  const nodeRef = refIndex.get(rootBlockId);
  if (!nodeRef) return false;
  return isRepeatExpansionGroupSelected(selectedBlockRef, nodeRef);
}

/**
 * 在预览作用域内测量选中框矩形（fixed 视口坐标）。
 * 移动预览下根选中时描边落在 `.email-preview-viewport` 上，避免被 overflow 裁切。
 */
export function measureCanvasSelectionOverlayRects(params: {
  scopeEl: HTMLElement;
  selectedBlockRef: VirtualBlockRef | null;
  refIndex: ReadonlyMap<string, VirtualBlockRef>;
  rootBlockId: string;
  rootSelectionOnViewport: boolean;
}): CanvasSelectionOverlayRect[] {
  const {
    scopeEl,
    selectedBlockRef,
    refIndex,
    rootBlockId,
    rootSelectionOnViewport,
  } = params;
  if (!selectedBlockRef) return [];

  const rootSelected = isPreviewRootBlockSelected(selectedBlockRef, rootBlockId, refIndex);
  if (rootSelected && rootSelectionOnViewport) {
    const viewport = scopeEl.closest<HTMLElement>(".email-preview-viewport");
    if (!viewport) return [];
    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];
    return [
      {
        key: "__email-preview-viewport__",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    ];
  }

  const blockIds = collectSelectedPreviewBlockIds(selectedBlockRef, refIndex);
  const rects: CanvasSelectionOverlayRect[] = [];
  for (const blockId of blockIds) {
    const safe = escapePreviewBlockIdForSelector(blockId);
    const el = scopeEl.querySelector<HTMLElement>(`[data-email-preview-block="${safe}"]`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    rects.push({
      key: blockId,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }
  return rects;
}
