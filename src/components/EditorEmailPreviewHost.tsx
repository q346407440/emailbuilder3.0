import { memo } from "react";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import { resolveCanvasPreviewViewportWidth } from "../editor-canvas-contract";
import { EmailPreview } from "./EmailPreview";
import { useEditorUiActions, useEditorUiSelector } from "../editor-ui/react";

type Props = {
  previewModel: RepeatPreviewModel;
  sourceTemplate: EmailTemplate;
  flatTemplate?: EmailTemplate;
  previewScopeRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * 画布预览订阅层：选中 / 视窗切换仅重渲染本组件，不牵动 App 文档态。
 */
export const EditorEmailPreviewHost = memo(function EditorEmailPreviewHost({
  previewModel,
  sourceTemplate,
  flatTemplate,
  previewScopeRef,
}: Props) {
  const selectedBlockRef = useEditorUiSelector((s) => s.selectedBlockRef);
  const previewViewportPx = useEditorUiSelector((s) =>
    resolveCanvasPreviewViewportWidth(s.canvasPreviewViewport)
  );
  const { selectBlock } = useEditorUiActions();

  return (
    <EmailPreview
      previewModel={previewModel}
      sourceTemplate={sourceTemplate}
      flatTemplate={flatTemplate}
      selectedBlockRef={selectedBlockRef}
      onSelectBlock={selectBlock}
      previewViewportPx={previewViewportPx}
      previewScopeRef={previewScopeRef}
    />
  );
});
