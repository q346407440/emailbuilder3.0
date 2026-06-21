import type { CanvasPreviewViewportMode } from "../editor-canvas-contract";
import type { WorkbenchView } from "../lib/validationIssueContext";
import type { VirtualBlockRef } from "../repeat-binding-contract";
import { refToStableKey } from "../repeat-runtime";
import type { EditorUiState, SelectBlockOptions } from "./types";

const initialState: EditorUiState = {
  workbenchView: "block",
  selectedBlockRef: null,
  canvasPreviewViewport: "desktop",
  blockTreeSyncNonce: 0,
};

let state: EditorUiState = { ...initialState };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getEditorUiState(): EditorUiState {
  return state;
}

export function subscribeEditorUi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function patchState(patch: Partial<EditorUiState>) {
  state = { ...state, ...patch };
  emit();
}

export function resetEditorUiState() {
  state = { ...initialState };
  emit();
}

export function setWorkbenchView(view: WorkbenchView) {
  if (state.workbenchView === view) return;
  patchState({ workbenchView: view });
}

export function setCanvasPreviewViewport(viewport: CanvasPreviewViewportMode) {
  if (state.canvasPreviewViewport === viewport) return;
  patchState({ canvasPreviewViewport: viewport });
}

export function selectBlockInEditorUi(ref: VirtualBlockRef | null, options?: SelectBlockOptions) {
  const prev = state.selectedBlockRef;
  const same =
    prev === ref ||
    (prev !== null && ref !== null && refToStableKey(prev) === refToStableKey(ref));
  if (same) {
    if (options?.resyncTree) {
      patchState({ blockTreeSyncNonce: state.blockTreeSyncNonce + 1 });
    }
    return;
  }
  patchState({ selectedBlockRef: ref });
}

export function setSelectedBlockRefDirect(ref: VirtualBlockRef | null) {
  if (state.selectedBlockRef === ref) return;
  patchState({ selectedBlockRef: ref });
}
