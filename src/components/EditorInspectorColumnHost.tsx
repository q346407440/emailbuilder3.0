import { memo, useMemo } from "react";
import type { InspectorMainTab } from "./AdminInspectorTabs";
import { Inspector } from "./Inspector";
import { PayloadInspector } from "./PayloadInspector";
import { TokenPresetInspector } from "./TokenPresetInspector";
import { WorkbenchSideSlot } from "./WorkbenchSideSlot";
import { useEditorUiSelector } from "../editor-ui/react";
import { resolveInspectorPanelTarget } from "../lib/inspectorPanelTarget";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import type { ExpandedTheme } from "../types/theme";
import type { RepeatPreviewModel } from "../repeat-binding-contract";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  previewPayload: EmailPayload;
  previewModel: RepeatPreviewModel | null;
  onUpdate: (next: { template: EmailTemplate; payload: EmailPayload }) => void;
  onTemplateChange: (
    next: EmailTemplate,
    options?: { selectBlockRef?: import("../repeat-binding-contract").VirtualBlockRef | null }
  ) => void;
  onDiscardPayloadSlotDraft: (slotId: string) => void;
  emailKey: string | null;
  layoutVariantId: string | null;
  effectiveDesignTokens: ExpandedTheme | null;
  tokenPresets: TokenPresets | null;
  onBlockMasterSaved: (master: import("../types/master").BlockMaster) => void;
  getFieldError: (bindPath: string) => string | undefined;
  getFieldWarning: (bindPath: string) => string | undefined;
  requestedInspectorTab: InspectorMainTab | null;
  onConsumedInspectorTabRequest: () => void;
  payloadSlotDrafts: import("../lib/payloadSlotDraft").PayloadSlotDraftMap;
  onSlotDraftChange: (slotId: string, draft: import("../lib/payloadSlotDraft").PayloadSlotDraft | null) => void;
  selectedPayloadSlotId: string | null;
  onPayloadChange: (next: EmailPayload) => void;
  onVariableDeleted: (next: {
    template: EmailTemplate;
    payload: EmailPayload;
    slotId: string;
  }) => void | Promise<void>;
  onSlotIdChange: (slotId: string | null) => void;
  tokenPresetForInspector: TokenPresets | null;
  stylePresetInspectorDirty: boolean;
  stylePresetListSelection: "local" | string;
  onSetAsTemplateDefault: () => void | Promise<void>;
  isTemplateDefaultForCurrentSelection: boolean;
  setAsTemplateDefaultDisabled: boolean;
  onDeleteGlobal: (presetId: string) => void | Promise<void>;
  onTokenPresetInspectorChange: (next: TokenPresets) => void;
  onSaveStylePreset: () => void | Promise<void>;
  tokenPresetsError?: string;
  tokenPresetsWarning?: string;
  getSlotError: (slotId: string) => string | undefined;
  getSlotWarning: (slotId: string) => string | undefined;
};

/**
 * 右侧属性面板订阅层：workbench 视图与选中变化仅重渲染本列。
 */
export const EditorInspectorColumnHost = memo(function EditorInspectorColumnHost(props: Props) {
  const workbenchView = useEditorUiSelector((s) => s.workbenchView);
  const selectedBlockRef = useEditorUiSelector((s) => s.selectedBlockRef);
  const selectedPayloadSlotId = props.selectedPayloadSlotId;
  const inspectorPanelTarget = useMemo(
    () => resolveInspectorPanelTarget(props.template, selectedBlockRef),
    [props.template, selectedBlockRef]
  );

  return (
    <WorkbenchSideSlot
      activeView={workbenchView}
      blockPane={
        <Inspector
          template={props.template}
          payload={props.payload}
          previewPayload={props.previewPayload}
          selectedBlockRef={selectedBlockRef}
          panelTarget={inspectorPanelTarget}
          previewModel={props.previewModel}
          onUpdate={props.onUpdate}
          onTemplateChange={props.onTemplateChange}
          onDiscardPayloadSlotDraft={props.onDiscardPayloadSlotDraft}
          emailKey={props.emailKey}
          layoutVariantId={props.layoutVariantId}
          effectiveDesignTokens={props.effectiveDesignTokens}
          tokenPresets={props.tokenPresets}
          onBlockMasterSaved={props.onBlockMasterSaved}
          getFieldError={props.getFieldError}
          getFieldWarning={props.getFieldWarning}
          requestedInspectorTab={props.requestedInspectorTab}
          onConsumedInspectorTabRequest={props.onConsumedInspectorTabRequest}
        />
      }
      payloadPane={
        <PayloadInspector
          template={props.template}
          payload={props.payload}
          slotDrafts={props.payloadSlotDrafts}
          onSlotDraftChange={props.onSlotDraftChange}
          selectedSlotId={selectedPayloadSlotId}
          onPayloadChange={props.onPayloadChange}
          onTemplatePayloadChange={props.onUpdate}
          onVariableDeleted={props.onVariableDeleted}
          onSlotIdChange={props.onSlotIdChange}
          slotValidationError={
            selectedPayloadSlotId ? props.getSlotError(selectedPayloadSlotId) : undefined
          }
          slotValidationWarning={
            selectedPayloadSlotId && !props.getSlotError(selectedPayloadSlotId)
              ? props.getSlotWarning(selectedPayloadSlotId)
              : undefined
          }
        />
      }
      tokensPane={
        <TokenPresetInspector
          tokenPresets={props.tokenPresetForInspector}
          dirty={props.stylePresetInspectorDirty}
          listSelection={props.stylePresetListSelection}
          onSetAsTemplateDefault={props.onSetAsTemplateDefault}
          isTemplateDefaultForCurrentSelection={props.isTemplateDefaultForCurrentSelection}
          setAsTemplateDefaultDisabled={props.setAsTemplateDefaultDisabled}
          onDeleteGlobal={props.onDeleteGlobal}
          onChange={props.onTokenPresetInspectorChange}
          onSave={props.onSaveStylePreset}
          validationError={props.tokenPresetsError}
          validationWarning={props.tokenPresetsWarning}
        />
      }
    />
  );
});
