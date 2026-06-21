import type { RepeatPreviewModel, VirtualBlockRef } from "../repeat-binding-contract";
import { findPreviewNodeByRef, refToStableKey } from "../repeat-runtime";
import { resolveInspectorPanelTarget } from "./inspectorPanelTarget";
import type { EmailTemplate } from "../types/email";

const PREWARM_BLOCK_LIMIT = 24;

/** 空闲时预热 Inspector 路径解析与预览节点查找，降低首次点选区块树的 JS 尖峰。 */
export function prewarmEditorInspectorLookups(
  template: EmailTemplate,
  previewModel: RepeatPreviewModel
): void {
  resolveInspectorPanelTarget(template, null);

  const blockIds = Object.keys(template.blocks).slice(0, PREWARM_BLOCK_LIMIT);
  for (const blockId of blockIds) {
    const ref: VirtualBlockRef = { kind: "physical", blockId };
    resolveInspectorPanelTarget(template, ref);
    findPreviewNodeByRef(previewModel, ref);
    refToStableKey(ref);
  }
}
