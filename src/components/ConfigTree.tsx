import type { ConfigSchema } from "../types/configSchema";

type Props = {
  configSchema: ConfigSchema | null;
  selectedScopeId: string | null;
  onSelect: (scopeId: string | null) => void;
};

export function ConfigTree({ configSchema, selectedScopeId, onSelect }: Props) {
  return (
    <aside className="config-tree">
      <div className="block-tree__title">配置面</div>
      <div className="config-tree__scroll">
        {!configSchema ? (
          <p className="config-tree__empty">当前模板没有 configSchema.json。</p>
        ) : (
          <>
            <button
              type="button"
              data-config-row="root"
              className={`config-tree__row ${selectedScopeId === null ? "config-tree__row--selected" : ""}`}
              onClick={() => onSelect(null)}
            >
              <span className="config-tree__row-title">全部配置</span>
              <span className="config-tree__row-meta">{configSchema.scopes.length} 个作用域</span>
            </button>
            {configSchema.scopes.map((scope) => (
              <button
                key={scope.scopeId}
                type="button"
                data-config-row={scope.scopeId}
                className={`config-tree__row ${selectedScopeId === scope.scopeId ? "config-tree__row--selected" : ""}`}
                onClick={() => onSelect(scope.scopeId)}
              >
                <span className="config-tree__row-title">{scope.label}</span>
                <span className="config-tree__row-meta">{scope.kind} · {scope.fields.length} 项</span>
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
