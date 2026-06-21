import type { CanvasPreviewViewportMode } from "../editor-canvas-contract";
import type { WorkbenchView } from "../lib/validationIssueContext";
import type { VirtualBlockRef } from "../repeat-binding-contract";

export type EditorUiState = {
  workbenchView: WorkbenchView;
  selectedBlockRef: VirtualBlockRef | null;
  canvasPreviewViewport: CanvasPreviewViewportMode;
  blockTreeSyncNonce: number;
};

export type SelectBlockOptions = {
  /** 同一区块重复选中时仍触发左侧树滚动定位 */
  resyncTree?: boolean;
};
