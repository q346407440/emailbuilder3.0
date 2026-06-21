import { useMemo } from "react";
import type { EmailTemplate } from "../types/email";
import type { WorkbenchView } from "../lib/validationIssueContext";
import type { ValidationIssue } from "../lib/validate";
import { resolveInspectorPanelTarget } from "../lib/inspectorPanelTarget";
import { useEditorUiSelector } from "../editor-ui/react";
import { useValidationIssuesForContext } from "./useValidationIssuesForContext";

type Params = {
  issues: ValidationIssue[];
  template: EmailTemplate | null;
  workbenchView: WorkbenchView;
};

/** 校验高亮：在 hook 内订阅选中态，避免 App 根因 selectedBlockRef 重渲染。 */
export function useValidationIssuesForEditor({
  issues,
  template,
  workbenchView,
}: Params) {
  const selectedBlockRef = useEditorUiSelector((s) => s.selectedBlockRef);
  const inspectorPanelBlockId = useMemo(
    () => (template ? resolveInspectorPanelTarget(template, selectedBlockRef).blockId : null),
    [template, selectedBlockRef]
  );

  return useValidationIssuesForContext({
    issues,
    template,
    selectedBlockRef,
    inspectorPanelBlockId,
    workbenchView,
  });
}
