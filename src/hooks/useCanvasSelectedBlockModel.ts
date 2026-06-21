import { useMemo } from "react";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import {
  findPreviewNodeByRef,
  refToStableKey,
  resolvePhysicalBlockId,
} from "../repeat-runtime";
import type { EmailTemplate } from "../types/email";
import { useEditorUiSelector } from "../editor-ui/react";
import { countCanvasLeftActionButtons } from "../lib/canvasBlockActionLayout";
import { canSaveAsSection } from "../section-master-contract";
import { getBlockSiblingMoveState } from "../lib/templateBlockSiblingOps";
import { isRepeatListBindingChildBlock } from "../lib/repeatRegion";

/** 画布工具条等：订阅选中态并派生区块操作模型，避免 App 根组件重渲染。 */
export function useCanvasSelectedBlockModel(
  template: EmailTemplate | null,
  previewModel: RepeatPreviewModel | null
) {
  const selectedBlockRef = useEditorUiSelector((s) => s.selectedBlockRef);

  return useMemo(() => {
    if (!template || !previewModel) {
      return {
        selectedBlockRef,
        selectedCanvasBlockKey: null as string | null,
        selectedPhysicalBlockId: null as string | null,
        selectedCanvasBlock: null,
        selectedTemplateBlock: null,
        selectedSupportsChildInsert: false,
        selectedSupportsBelowInsert: false,
        selectedCanSaveAsSection: false,
        selectedCanDelete: false,
        isRepeatListBindingChild: false,
        siblingMoveState: null as ReturnType<typeof getBlockSiblingMoveState> | null,
        selectedCanDuplicate: false,
        selectedCanDragMove: false,
        selectedCanvasBlockLabel: "",
        showCanvasLeftActions: false,
        showCanvasBlockActions: false,
        canvasLeftActionButtonCount: 0,
        canvasDeleteActionButtonCount: 0,
      };
    }

    const selectedCanvasBlockKey = selectedBlockRef ? refToStableKey(selectedBlockRef) : null;
    const selectedPhysicalBlockId = selectedBlockRef
      ? resolvePhysicalBlockId(selectedBlockRef)
      : null;
    const selectedPreviewNode =
      selectedBlockRef ? findPreviewNodeByRef(previewModel, selectedBlockRef) : null;
    const selectedCanvasBlock = selectedPreviewNode?.block ?? null;
    const selectedTemplateBlock = selectedPhysicalBlockId
      ? template.blocks[selectedPhysicalBlockId] ?? null
      : null;

    const selectedSupportsChildInsert =
      selectedCanvasBlock?.type === "emailRoot" ||
      selectedCanvasBlock?.type === "layout" ||
      selectedCanvasBlock?.type === "grid" ||
      selectedCanvasBlock?.type === "image";
    const selectedSupportsBelowInsert = Boolean(
      selectedCanvasBlock && selectedCanvasBlock.type !== "emailRoot" && selectedCanvasBlock.parentId
    );
    const selectedCanSaveAsSection = Boolean(
      selectedTemplateBlock && canSaveAsSection(selectedTemplateBlock)
    );
    const selectedCanDelete = Boolean(
      selectedCanvasBlock && selectedCanvasBlock.type !== "emailRoot"
    );
    const isRepeatListBindingChild = selectedPhysicalBlockId
      ? isRepeatListBindingChildBlock(template, selectedPhysicalBlockId)
      : false;
    const siblingMoveState = selectedPhysicalBlockId
      ? getBlockSiblingMoveState(template, selectedPhysicalBlockId)
      : null;
    const selectedCanDuplicate = Boolean(
      selectedTemplateBlock &&
        selectedTemplateBlock.type !== "emailRoot" &&
        selectedTemplateBlock.parentId
    );
    const selectedCanDragMove = Boolean(
      selectedTemplateBlock &&
        selectedTemplateBlock.type !== "emailRoot" &&
        selectedTemplateBlock.parentId &&
        !isRepeatListBindingChild
    );
    const selectedCanvasBlockLabel =
      selectedPhysicalBlockId && template
        ? template.blockMeta?.[selectedPhysicalBlockId]?.name?.trim() || selectedPhysicalBlockId
        : "";
    const showCanvasLeftActions =
      !isRepeatListBindingChild &&
      (selectedCanDragMove ||
        Boolean(siblingMoveState) ||
        selectedCanDuplicate ||
        selectedSupportsChildInsert ||
        selectedSupportsBelowInsert ||
        selectedCanSaveAsSection);
    const showCanvasBlockActions =
      !isRepeatListBindingChild && (showCanvasLeftActions || selectedCanDelete);

    const canvasLeftActionButtonCount = showCanvasLeftActions
      ? countCanvasLeftActionButtons({
          canDragMove: selectedCanDragMove,
          siblingMoveEnabled: Boolean(siblingMoveState),
          canDuplicate: selectedCanDuplicate,
          supportsChildInsert: selectedSupportsChildInsert,
          supportsBelowInsert: selectedSupportsBelowInsert,
          canSaveAsSection: selectedCanSaveAsSection,
        })
      : 0;
    const canvasDeleteActionButtonCount = selectedCanDelete ? 1 : 0;

    return {
      selectedBlockRef,
      selectedCanvasBlockKey,
      selectedPhysicalBlockId,
      selectedCanvasBlock,
      selectedTemplateBlock,
      selectedSupportsChildInsert,
      selectedSupportsBelowInsert,
      selectedCanSaveAsSection,
      selectedCanDelete,
      isRepeatListBindingChild,
      siblingMoveState,
      selectedCanDuplicate,
      selectedCanDragMove,
      selectedCanvasBlockLabel,
      showCanvasLeftActions,
      showCanvasBlockActions,
      canvasLeftActionButtonCount,
      canvasDeleteActionButtonCount,
    };
  }, [template, previewModel, selectedBlockRef]);
}
