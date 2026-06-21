import { useEffect, useState } from "react";
import type { BlockCatalogEntry } from "../../lib/blockDefaults";
import {
  BLOCK_TYPE_SHORT,
  sortBlockCatalogEntriesForInsertUi,
} from "../../lib/blockInsertUiCatalog";
import type { SectionCatalogItem } from "../../lib/sectionCatalog";
import { ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";
import { SectionModuleRow } from "./SectionModuleRow";

export type InsertModalTab = "blocks" | "sections";

type Props = {
  visible: boolean;
  title: string;
  entries: BlockCatalogEntry[];
  sections: SectionCatalogItem[];
  busy?: boolean;
  onCancel: () => void;
  onPick: (entry: BlockCatalogEntry) => void;
  onPickSection: (masterId: string) => void;
  onRenameSection: (masterId: string, name: string) => Promise<void>;
  onDeleteSection: (masterId: string) => Promise<void>;
};

export function CanvasInsertBlockModal({
  visible,
  title,
  entries,
  sections,
  busy,
  onCancel,
  onPick,
  onPickSection,
  onRenameSection,
  onDeleteSection,
}: Props) {
  const [tab, setTab] = useState<InsertModalTab>("blocks");

  useEffect(() => {
    if (visible) setTab("blocks");
  }, [visible]);

  const sortedBlocks = sortBlockCatalogEntriesForInsertUi(entries);

  const sortedSections = [...sections].sort((a, b) =>
    a.name.localeCompare(b.name, "zh-CN")
  );

  if (!visible) return null;

  return (
    <ShopSectionModal
      visible
      title={title}
      width={560}
      wrapClassName="canvas-insert-modal-wrap shop-section-modal-wrap"
      onCancel={onCancel}
      maskClosable={!busy}
      closable={!busy}
      destroyOnClose
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={onCancel} disabled={busy}>
            取消
          </ShopSecondaryButton>
        </div>
      }
    >
      <div className={`canvas-insert-modal${busy ? " canvas-insert-modal--busy" : ""}`}>
        <p className="canvas-insert-modal__hint">选择一项即可插入；插入后可在右侧配置面板继续调整。</p>

        <div className="canvas-insert-modal__segment" role="tablist" aria-label="插入来源">
          <button
            type="button"
            role="tab"
            className={
              tab === "blocks"
                ? "canvas-insert-modal__segment-item canvas-insert-modal__segment-item--active"
                : "canvas-insert-modal__segment-item"
            }
            disabled={busy}
            aria-selected={tab === "blocks"}
            onClick={() => setTab("blocks")}
          >
            基础组件
          </button>
          <button
            type="button"
            role="tab"
            className={
              tab === "sections"
                ? "canvas-insert-modal__segment-item canvas-insert-modal__segment-item--active"
                : "canvas-insert-modal__segment-item"
            }
            disabled={busy}
            aria-selected={tab === "sections"}
            onClick={() => setTab("sections")}
          >
            我的模块
            {sortedSections.length > 0 ? (
              <span className="canvas-insert-modal__segment-badge">{sortedSections.length}</span>
            ) : null}
          </button>
        </div>

        <div className="canvas-insert-modal__panel" role="tabpanel">
          {tab === "blocks" ? (
            <ul className="canvas-insert-modal__tile-grid">
              {sortedBlocks.map((entry) => (
                <li key={entry.masterId}>
                  <button
                    type="button"
                    className="canvas-insert-modal__tile"
                    disabled={busy}
                    onClick={() => onPick(entry)}
                  >
                    <span className="canvas-insert-modal__tile-tag">
                      {BLOCK_TYPE_SHORT[entry.masterId] ?? "组件"}
                    </span>
                    <span className="canvas-insert-modal__tile-name">{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : sortedSections.length === 0 ? (
            <div className="canvas-insert-modal__empty">
              <p className="canvas-insert-modal__empty-title">暂无已存模块</p>
              <p className="canvas-insert-modal__empty-desc">
                在画布选中<strong>布局容器</strong>、<strong>栅格</strong>或<strong>图片（叠放外壳）</strong>
                后，点击「存为模块」即可保存当前组合。
              </p>
            </div>
          ) : (
            <ul className="section-module-list">
              {sortedSections.map((item) => (
                <SectionModuleRow
                  key={item.masterId}
                  item={item}
                  disabled={busy}
                  onPick={() => onPickSection(item.masterId)}
                  onRenameSection={onRenameSection}
                  onDeleteSection={onDeleteSection}
                />
              ))}
            </ul>
          )}
        </div>

        {busy ? (
          <div className="canvas-insert-modal__busy" aria-live="polite">
            正在插入…
          </div>
        ) : null}
      </div>
    </ShopSectionModal>
  );
}
