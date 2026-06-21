import type { VirtualBlockRef } from "../repeat-binding-contract";
import { resolvePhysicalBlockId } from "../repeat-runtime";
import type { EmailTemplate } from "../types/email";

/** 右侧 Inspector 编辑对象（空选中时与 selectedBlockRef 解耦，仅面板回落到邮件根） */
export type InspectorPanelTarget =
  | { kind: "email-root"; blockId: string }
  | { kind: "block"; blockId: string; ref: VirtualBlockRef };

/** 无选中：面板编辑邮件根（非选中）；有选中：面板编辑对应区块（含邮件根选中）。 */
export function resolveInspectorPanelTarget(
  template: EmailTemplate,
  selectedBlockRef: VirtualBlockRef | null
): InspectorPanelTarget {
  const rootBlockId = template.rootBlockId;
  if (!selectedBlockRef) {
    return { kind: "email-root", blockId: rootBlockId };
  }
  return {
    kind: "block",
    blockId: resolvePhysicalBlockId(selectedBlockRef),
    ref: selectedBlockRef,
  };
}

export function isEmailRootInspectorPanel(target: InspectorPanelTarget): boolean {
  return target.kind === "email-root";
}
