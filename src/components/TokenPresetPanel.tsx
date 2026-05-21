import type { TokenPresets } from "../types/tokenPreset";

type Props = {
  tokenPresets: TokenPresets | null;
  globalTokenPresets: Array<{ presetId: string; tokenPresets: TokenPresets }>;
  /** 与侧栏单选一致：`local` 表示本邮件；否则为公共预设的 presetId */
  activeListKey: "local" | string;
  onSelectLocal: () => void;
  onSelectGlobal: (presetId: string) => void;
};

export function TokenPresetPanel({
  tokenPresets,
  globalTokenPresets,
  activeListKey,
  onSelectLocal,
  onSelectGlobal,
}: Props) {
  return (
    <aside className="theme-panel theme-sidebar">
      <header className="theme-panel__header">
        <h2 className="side-panel__title">样式预设</h2>
      </header>
      <div className="theme-panel__body theme-panel__side-nav">
        <div className="theme-panel__group">
          <h3 className="theme-panel__group-title">本邮件</h3>
          <ul className="theme-panel__option-list">
            <li>
              <button
                type="button"
                className={`theme-panel__option${activeListKey === "local" ? " theme-panel__option--active" : ""}`}
                onClick={onSelectLocal}
              >
                <span className="theme-panel__option-title">
                  {tokenPresets?.presets[tokenPresets.activePresetId]?.label ?? "本邮件预设"}
                </span>
                <span className="theme-panel__option-meta">{tokenPresets?.activePresetId ?? "未配置"}</span>
              </button>
            </li>
          </ul>
        </div>
        <div className="theme-panel__group">
          <h3 className="theme-panel__group-title">公共预设</h3>
          {globalTokenPresets.length ? (
            <ul className="theme-panel__option-list">
              {globalTokenPresets.map((item) => (
                <li key={item.presetId}>
                  <button
                    type="button"
                    className={`theme-panel__option${activeListKey === item.presetId ? " theme-panel__option--active" : ""}`}
                    onClick={() => onSelectGlobal(item.presetId)}
                  >
                    <span className="theme-panel__option-title">
                      {item.tokenPresets.presets[item.tokenPresets.activePresetId]?.label ?? item.presetId}
                    </span>
                    <span className="theme-panel__option-meta">{item.presetId}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="inspector__muted theme-panel__group-empty">暂无</p>
          )}
        </div>
      </div>
    </aside>
  );
}
