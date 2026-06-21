import { memo } from "react";
import type { BlockCatalogEntry } from "../lib/blockDefaults";
import type { SectionCatalogItem } from "../lib/sectionCatalog";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { PayloadPanel } from "./PayloadPanel";
import { TokenPresetPanel } from "./TokenPresetPanel";
import { WorkbenchSideSlot } from "./WorkbenchSideSlot";
import { WorkspaceBlockLeftPanel } from "./WorkspaceBlockLeftPanel";
import { useEditorUiActions, useEditorUiSelector } from "../editor-ui/react";

type Props = {
  template: EmailTemplate;
  payload: EmailPayload;
  previewModel: RepeatPreviewModel | null;
  insertableEntries: readonly BlockCatalogEntry[];
  sectionCatalogItems: readonly SectionCatalogItem[];
  onRenameSection: (masterId: string, name: string) => Promise<void>;
  onDeleteSection: (masterId: string) => Promise<void>;
  selectedPayloadSlotId: string | null;
  onSelectPayloadSlot: (slotId: string) => void;
  onPayloadChange: (next: EmailPayload) => void;
  onPayloadPanelVariableCreated: (args: { payload: EmailPayload; slotId: string }) => void | Promise<void>;
  globalTokenPresetsList: Array<{ presetId: string; tokenPresets: TokenPresets }>;
  tokenPresets: TokenPresets | null;
  stylePresetListSelection: "local" | string;
  onSelectLocalStylePreset: () => void;
  onSelectGlobalStylePreset: (presetId: string) => void;
  createGlobalStylePreset: (displayLabel: string) => Promise<void>;
  getSlotError: (slotId: string) => string | undefined;
  getSlotWarning: (slotId: string) => string | undefined;
  tokenPresetsError?: string;
  tokenPresetsWarning?: string;
  blockErrorIds: ReadonlySet<string>;
  blockWarnIds: ReadonlySet<string>;
};

export const EditorLeftPanelHost = memo(function EditorLeftPanelHost(props: Props) {
  const workbenchView = useEditorUiSelector((s) => s.workbenchView);
  const selectedBlockRef = useEditorUiSelector((s) => s.selectedBlockRef);
  const blockTreeSyncNonce = useEditorUiSelector((s) => s.blockTreeSyncNonce);
  const { selectBlock } = useEditorUiActions();

  return (
    <WorkbenchSideSlot
      activeView={workbenchView}
      blockPane={
        props.previewModel ? (
          <WorkspaceBlockLeftPanel
            sourceTemplate={props.template}
            previewModel={props.previewModel}
            selectedBlockRef={selectedBlockRef}
            syncNonce={blockTreeSyncNonce}
            onSelectBlock={selectBlock}
            blockErrorIds={props.blockErrorIds}
            blockWarnIds={props.blockWarnIds}
            blockEntries={props.insertableEntries}
            sectionItems={props.sectionCatalogItems}
            onRenameSection={props.onRenameSection}
            onDeleteSection={props.onDeleteSection}
          />
        ) : (
          <aside className="block-tree">
            <p className="inspector__muted">预览暂不可用</p>
          </aside>
        )
      }
      payloadPane={
        <PayloadPanel
          template={props.template}
          payload={props.payload}
          selectedSlotId={props.selectedPayloadSlotId}
          onSelectSlot={props.onSelectPayloadSlot}
          onPayloadChange={props.onPayloadChange}
          getSlotError={props.getSlotError}
          getSlotWarning={props.getSlotWarning}
          onVariableCreated={props.onPayloadPanelVariableCreated}
        />
      }
      tokensPane={
        <TokenPresetPanel
          tokenPresets={props.tokenPresets}
          globalTokenPresets={props.globalTokenPresetsList}
          activeListKey={props.stylePresetListSelection}
          onSelectLocal={props.onSelectLocalStylePreset}
          onSelectGlobal={props.onSelectGlobalStylePreset}
          onCreateGlobal={props.createGlobalStylePreset}
          localValidationHint={props.tokenPresetsError ?? props.tokenPresetsWarning}
        />
      }
    />
  );
});
