import { useState } from "react";
import type { TokenPresets } from "../types/tokenPreset";
import { GlobalTokenPresetCreateModal } from "./GlobalTokenPresetCreateModal";
import { SidebarNavRow } from "./ui/SidebarNavRow";

type Props = {
  tokenPresets: TokenPresets | null;
  globalTokenPresets: Array<{ presetId: string; tokenPresets: TokenPresets }>;
  /** 与侧栏单选一致：`local` 表示本邮件；否则为公共预设的 presetId */
  activeListKey: "local" | string;
  onSelectLocal: () => void;
  onSelectGlobal: (presetId: string) => void;
  onCreateGlobal: (displayLabel: string) => Promise<void>;
  /** 本邮件 tokenPresets 顶层校验摘要（展示在「本邮件」行） */
  localValidationHint?: string;
};

export function TokenPresetPanel({
  tokenPresets,
  globalTokenPresets,
  activeListKey,
  onSelectLocal,
  onSelectGlobal,
  onCreateGlobal,
  localValidationHint,
}: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (displayLabel: string) => {
    setCreating(true);
    try {
      await onCreateGlobal(displayLabel);
      setCreateModalOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const localLabel = tokenPresets?.presets[tokenPresets.activePresetId]?.label ?? "本邮件预设";
  const localMeta = tokenPresets?.activePresetId ?? "未配置";

  const presetCount = 1 + globalTokenPresets.length;

  return (
    <>
      <aside className="block-tree token-preset-panel" aria-label="样式预设">
        <div className="block-tree__title token-preset-panel__title">
          <span>样式预设</span>
          <span className="token-preset-panel__title-count" aria-label={`共 ${presetCount} 套`}>
            {presetCount} 套
          </span>
        </div>
        <div className="block-tree__scroll token-preset-panel__scroll">
          <div className="theme-panel__group">
            <h3 className="theme-panel__group-title">本邮件</h3>
            <ul className="theme-panel__option-list sidebar-nav-list">
              <SidebarNavRow
                active={activeListKey === "local"}
                title={localLabel}
                meta={localValidationHint ? `${localMeta} · 须检查` : localMeta}
                onSelect={onSelectLocal}
                className={localValidationHint ? "sidebar-nav-row--validation-error" : undefined}
                rowTitle={localValidationHint}
              />
            </ul>
          </div>
          <div className="theme-panel__group">
            <div className="theme-panel__group-head">
              <h3 className="theme-panel__group-title">公共预设</h3>
              <button
                type="button"
                className="resource-text-action"
                disabled={creating}
                onClick={() => setCreateModalOpen(true)}
              >
                新建
              </button>
            </div>
            {globalTokenPresets.length ? (
              <ul className="theme-panel__option-list sidebar-nav-list">
                {globalTokenPresets.map((item) => {
                  const label =
                    item.tokenPresets.presets[item.tokenPresets.activePresetId]?.label ?? item.presetId;
                  const isActive = activeListKey === item.presetId;
                  return (
                    <SidebarNavRow
                      key={item.presetId}
                      active={isActive}
                      title={label}
                      meta={item.presetId}
                      onSelect={() => onSelectGlobal(item.presetId)}
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="inspector__muted theme-panel__group-empty">暂无</p>
            )}
          </div>
        </div>
      </aside>
      <GlobalTokenPresetCreateModal
        visible={createModalOpen}
        creating={creating}
        onCancel={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </>
  );
}
