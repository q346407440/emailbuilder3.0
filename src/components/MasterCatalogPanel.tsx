import type { BlockMaster, SectionMaster } from "../types/master";
import type { EmailTemplate } from "../types/email";
import { sectionSubtreeBlockCount } from "../lib/masterCatalog";
import { BlockTree } from "./BlockTree";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

export type MasterCatalogTab = "blocks" | "sections";

type Props = {
  tab: MasterCatalogTab;
  onTabChange: (tab: MasterCatalogTab) => void;
  blockMasters: BlockMaster[];
  sectionMasters: SectionMaster[];
  selectedBlockMasterId: string | null;
  selectedSectionMasterId: string | null;
  expandedSectionIds: Record<string, boolean>;
  catalogTemplate: EmailTemplate | null;
  catalogSelectedBlockId: string | null;
  catalogBlockSyncNonce: number;
  onSelectBlockMaster: (masterId: string) => void;
  onSelectSectionMaster: (masterId: string) => void;
  onToggleSectionExpanded: (masterId: string) => void;
  onSelectCatalogBlock: (blockId: string | null) => void;
  sectionPreviewTemplate: (master: SectionMaster) => EmailTemplate;
};

export function MasterCatalogPanel({
  tab,
  onTabChange,
  blockMasters,
  sectionMasters,
  selectedBlockMasterId,
  selectedSectionMasterId,
  expandedSectionIds,
  catalogTemplate,
  catalogSelectedBlockId,
  catalogBlockSyncNonce,
  onSelectBlockMaster,
  onSelectSectionMaster,
  onToggleSectionExpanded,
  onSelectCatalogBlock,
  sectionPreviewTemplate,
}: Props) {
  const selectedBlockMaster = blockMasters.find((m) => m.masterId === selectedBlockMasterId) ?? null;

  return (
    <aside className="block-tree master-catalog">
      <div className="block-tree__title">组件库</div>
      <div className="master-catalog__tabs" role="tablist" aria-label="物料分类">
        {(
          [
            ["blocks", "基础 Block"],
            ["sections", "Section"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`topbar__view-btn master-catalog__tab ${tab === key ? "topbar__view-btn--active" : ""}`}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="master-catalog__body">
        {tab === "blocks" ? (
          <>
            <div className="master-catalog__list">
              {blockMasters.map((master) => {
                const selected = selectedBlockMasterId === master.masterId;
                return (
                  <button
                    key={master.masterId}
                    type="button"
                    className={`config-tree__row ${selected ? "config-tree__row--selected" : ""}`}
                    onClick={() => onSelectBlockMaster(master.masterId)}
                  >
                    <span className="config-tree__row-title">{master.name}</span>
                    <span className="config-tree__row-meta">{master.runtimeType}</span>
                  </button>
                );
              })}
            </div>
            {selectedBlockMaster && catalogTemplate ? (
              <div className="master-catalog__tree-pane">
                <BlockTree
                  template={catalogTemplate}
                  selectedBlockId={catalogSelectedBlockId}
                  syncNonce={catalogBlockSyncNonce}
                  onSelect={onSelectCatalogBlock}
                  variant="embedded"
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="master-catalog__accordion">
            {sectionMasters.map((master) => {
              const expanded = expandedSectionIds[master.masterId] ?? false;
              const selected = selectedSectionMasterId === master.masterId;
              const preview = sectionPreviewTemplate(master);
              return (
                <div key={master.masterId} className="master-catalog__accordion-item">
                  <div
                    className={`master-catalog__accordion-head ${selected ? "master-catalog__accordion-head--selected" : ""}`}
                  >
                    <ShopSecondaryButton
                      className="block-tree__toggle master-catalog__accordion-toggle"
                      onClick={() => onToggleSectionExpanded(master.masterId)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "折叠 Section" : "展开 Section"}
                    >
                      {expanded ? "▼" : "▶"}
                    </ShopSecondaryButton>
                    <button
                      type="button"
                      className="master-catalog__accordion-title"
                      onClick={() => onSelectSectionMaster(master.masterId)}
                    >
                      <span className="config-tree__row-title">{master.name}</span>
                      <span className="config-tree__row-meta">{sectionSubtreeBlockCount(master)} 个区块</span>
                    </button>
                  </div>
                  {expanded ? (
                    <div className="master-catalog__tree-pane master-catalog__tree-pane--section">
                      <BlockTree
                        template={preview}
                        selectedBlockId={selected ? catalogSelectedBlockId : null}
                        syncNonce={catalogBlockSyncNonce}
                        onSelect={onSelectCatalogBlock}
                        variant="embedded"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
