import { memo, useState } from "react";
import {
  AppstoreOutlined,
  ApartmentOutlined,
  BlockOutlined,
} from "@ant-design/icons";
import type { BlockCatalogEntry } from "../lib/blockDefaults";
import { sortBlockCatalogEntriesForInsertUi, BLOCK_TYPE_SHORT } from "../lib/blockInsertUiCatalog";
import type { SectionCatalogItem } from "../lib/sectionCatalog";
import type { VirtualBlockRef } from "../repeat-binding-contract";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import { BlockTree } from "./BlockTree";
import { SectionModuleRow } from "./ui/SectionModuleRow";
import { CanvasDragPaletteItem } from "./canvas/CanvasDragPaletteItem";

export type WorkspaceBlockLeftTab = "components" | "modules" | "tree";

type TabDef = {
  key: WorkspaceBlockLeftTab;
  label: string;
  icon: typeof AppstoreOutlined;
};

const TABS: readonly TabDef[] = [
  { key: "components", label: "组件", icon: AppstoreOutlined },
  { key: "modules", label: "模块", icon: BlockOutlined },
  { key: "tree", label: "区块结构", icon: ApartmentOutlined },
];

type Props = {
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  selectedBlockRef: VirtualBlockRef | null;
  syncNonce: number;
  onSelectBlock: (ref: VirtualBlockRef | null) => void;
  blockErrorIds?: ReadonlySet<string>;
  blockWarnIds?: ReadonlySet<string>;
  blockEntries: readonly BlockCatalogEntry[];
  sectionItems: readonly SectionCatalogItem[];
  onRenameSection: (masterId: string, name: string) => Promise<void>;
  onDeleteSection: (masterId: string) => Promise<void>;
};

function WorkspaceBlockLeftPanelImpl({
  sourceTemplate,
  previewModel,
  selectedBlockRef,
  syncNonce,
  onSelectBlock,
  blockErrorIds,
  blockWarnIds,
  blockEntries,
  sectionItems,
  onRenameSection,
  onDeleteSection,
}: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceBlockLeftTab>("tree");

  const sortedBlocks = sortBlockCatalogEntriesForInsertUi(blockEntries);
  const sortedSections = [...sectionItems].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN")
  );

  return (
    <aside className="workspace-left-panel" aria-label="模板组件侧栏">
      <div className="workspace-left-panel__tabs" role="tablist" aria-label="侧栏视图">
        {TABS.map(({ key, label, icon: Icon }) => {
          const selected = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              className={
                selected
                  ? "workspace-left-panel__tab workspace-left-panel__tab--active"
                  : "workspace-left-panel__tab"
              }
              aria-selected={selected}
              title={label}
              aria-label={label}
              onClick={() => setActiveTab(key)}
            >
              <Icon aria-hidden />
            </button>
          );
        })}
      </div>

      <div className="workspace-left-panel__body" role="tabpanel" aria-label={TABS.find((t) => t.key === activeTab)?.label}>
        {activeTab === "components" ? (
          <div className="workspace-left-panel__scroll">
            <ul className="workspace-left-panel__component-list">
              {sortedBlocks.map((entry) => (
                <li key={entry.masterId}>
                  <CanvasDragPaletteItem
                    payload={{ kind: "block", masterId: entry.masterId, label: entry.name }}
                    className="workspace-left-panel__component-row workspace-left-panel__component-row--draggable"
                  >
                    <span className="workspace-left-panel__component-tag">
                      {BLOCK_TYPE_SHORT[entry.masterId] ?? "组件"}
                    </span>
                    <span className="workspace-left-panel__component-name">{entry.name}</span>
                  </CanvasDragPaletteItem>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {activeTab === "modules" ? (
          <div className="workspace-left-panel__scroll workspace-left-panel__scroll--modules">
            {sortedSections.length === 0 ? (
              <div className="workspace-left-panel__modules-empty">
                <p className="workspace-left-panel__modules-empty-title">暂无已存模块</p>
                <p className="workspace-left-panel__modules-empty-desc">
                  在画布选中<strong>布局容器</strong>、<strong>栅格</strong>或<strong>图片（叠放外壳）</strong>
                  后，点击「存为模块」即可保存当前组合。
                </p>
              </div>
            ) : (
              <ul className="section-module-list">
                {sortedSections.map((item) => (
                  <li key={item.masterId}>
                    <CanvasDragPaletteItem
                      payload={{ kind: "section", masterId: item.masterId, label: item.name }}
                      className="workspace-left-panel__module-drag-row"
                    >
                      <SectionModuleRow
                        variant="embedded"
                        item={item}
                        preventDragOnInteractive
                        onRenameSection={onRenameSection}
                        onDeleteSection={onDeleteSection}
                      />
                    </CanvasDragPaletteItem>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {activeTab === "tree" ? (
          <BlockTree
            sourceTemplate={sourceTemplate}
            previewModel={previewModel}
            selectedBlockRef={selectedBlockRef}
            syncNonce={syncNonce}
            onSelect={onSelectBlock}
            blockErrorIds={blockErrorIds}
            blockWarnIds={blockWarnIds}
            variant="panel"
            title="区块结构"
          />
        ) : null}
      </div>
    </aside>
  );
}

/**
 * 左侧区块树面板（含 BlockTree，节点可达数百）。App 因画布工具条滚动重定位等
 * 无关状态频繁重渲染时不应连带重渲染本面板。props 均为稳定引用。
 */
export const WorkspaceBlockLeftPanel = memo(WorkspaceBlockLeftPanelImpl);
