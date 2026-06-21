import { useCallback, useSyncExternalStore } from "react";
import type { CanvasPreviewViewportMode } from "../editor-canvas-contract";
import type { WorkbenchView } from "../lib/validationIssueContext";
import type { VirtualBlockRef } from "../repeat-binding-contract";
import {
  getEditorUiState,
  selectBlockInEditorUi,
  setCanvasPreviewViewport,
  setSelectedBlockRefDirect,
  setWorkbenchView,
  subscribeEditorUi,
} from "./store";
import type { EditorUiState, SelectBlockOptions } from "./types";

export function useEditorUiSelector<T>(selector: (state: EditorUiState) => T): T {
  return useSyncExternalStore(
    subscribeEditorUi,
    () => selector(getEditorUiState()),
    () => selector(getEditorUiState())
  );
}

export function useEditorUiActions() {
  const selectBlock = useCallback((ref: VirtualBlockRef | null, options?: SelectBlockOptions) => {
    selectBlockInEditorUi(ref, options);
  }, []);

  const setWorkbenchViewStable = useCallback((view: WorkbenchView) => {
    setWorkbenchView(view);
  }, []);

  const setViewport = useCallback((viewport: CanvasPreviewViewportMode) => {
    setCanvasPreviewViewport(viewport);
  }, []);

  const setSelectedBlockRef = useCallback((ref: VirtualBlockRef | null) => {
    setSelectedBlockRefDirect(ref);
  }, []);

  return {
    selectBlock,
    setWorkbenchView: setWorkbenchViewStable,
    setCanvasPreviewViewport: setViewport,
    setSelectedBlockRef,
  };
}
