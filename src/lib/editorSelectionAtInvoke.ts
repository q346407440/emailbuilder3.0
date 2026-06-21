import { getEditorUiState } from "../editor-ui/store";
import { resolvePhysicalBlockId } from "../repeat-runtime";

/** 在事件回调中读取当前选中物理块 id（无需 App 订阅 selectedBlockRef）。 */
export function getSelectedPhysicalBlockIdAtInvoke(): string | null {
  const selected = getEditorUiState().selectedBlockRef;
  return selected ? resolvePhysicalBlockId(selected) : null;
}

export function getSelectedBlockRefAtInvoke() {
  return getEditorUiState().selectedBlockRef;
}
