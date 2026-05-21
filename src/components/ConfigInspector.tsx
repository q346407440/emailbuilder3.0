import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ConfigField, ConfigSchema, ConfigScope } from "../types/configSchema";
import type { TokenPresets, TokenScaleSelection } from "../types/tokenPreset";
import { applyConfigValue, getTokenScaleSelection } from "../lib/applyConfigValue";
import { readConfigTargetValue } from "../lib/configSchemaTargets";
import { ShopInput, ShopSelect, ShopTextArea } from "./ui/ShopFormControls";

type Props = {
  configSchema: ConfigSchema | null;
  selectedScopeId: string | null;
  template: EmailTemplate;
  payload: EmailPayload;
  tokenPresets: TokenPresets | null;
  onChange: (next: { template: EmailTemplate; payload: EmailPayload; tokenPresets: TokenPresets | null }) => void;
};

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}

function scaleOptions(tokenPresets: TokenPresets | null, family: string | undefined): string[] {
  if (!tokenPresets || !family) return [];
  const preset = tokenPresets.presets[tokenPresets.activePresetId] ?? Object.values(tokenPresets.presets)[0];
  return Object.keys(preset?.tokens?.[family] ?? {});
}

function TokenScaleField({
  scope,
  field,
  tokenPresets,
  onChange,
}: {
  scope: ConfigScope;
  field: ConfigField;
  tokenPresets: TokenPresets | null;
  onChange: (selection: TokenScaleSelection) => void;
}) {
  const selection = getTokenScaleSelection(tokenPresets, scope.scopeId, field.key) ?? { mode: "follow" as const };
  const options = scaleOptions(tokenPresets, field.tokenFamily);
  const selectValue = selection.mode === "scale" ? selection.scale : selection.mode;
  return (
    <div className="inspector__field">
      <label className="inspector__label">{field.label}</label>
      <ShopSelect
        value={selectValue}
        onChange={(next) => {
          const value = String(next);
          if (value === "follow") onChange({ mode: "follow" });
          else if (value === "custom") onChange({ mode: "custom", value: "" });
          else onChange({ mode: "scale", scale: value });
        }}
      >
        <ShopSelect.Option value="follow">跟随整体</ShopSelect.Option>
        {options.map((option) => (
          <ShopSelect.Option key={option} value={option}>
            {option}
          </ShopSelect.Option>
        ))}
        {field.allowCustom ? <ShopSelect.Option value="custom">自定义</ShopSelect.Option> : null}
      </ShopSelect>
      {selection.mode === "custom" ? (
        <ShopInput
          value={selection.value}
          placeholder="例如 12px"
          onChange={(event) => onChange({ mode: "custom", value: event.target.value })}
        />
      ) : null}
      {field.description ? <p className="inspector__muted">{field.description}</p> : null}
    </div>
  );
}

function ConfigFieldEditor({
  scope,
  field,
  template,
  payload,
  tokenPresets,
  onApply,
}: {
  scope: ConfigScope;
  field: ConfigField;
  template: EmailTemplate;
  payload: EmailPayload;
  tokenPresets: TokenPresets | null;
  onApply: (value: unknown) => void;
}) {
  if (field.control === "tokenScale") {
    return (
      <TokenScaleField
        scope={scope}
        field={field}
        tokenPresets={tokenPresets}
        onChange={onApply}
      />
    );
  }

  const rawValue = readConfigTargetValue(field.target, { template, payload, tokenPresets });
  const value = stringifyValue(rawValue);
  return (
    <div className="inspector__field">
      <label className="inspector__label">{field.label}</label>
      {field.control === "textarea" ? (
        <ShopTextArea value={value} onChange={(event) => onApply(event.target.value)} />
      ) : field.control === "select" && field.options?.length ? (
        <ShopSelect value={value} onChange={(next) => onApply(next)}>
          {field.options.map((option) => (
            <ShopSelect.Option key={String(option.value)} value={option.value}>
              {option.label}
            </ShopSelect.Option>
          ))}
        </ShopSelect>
      ) : (
        <ShopInput
          value={value}
          type={field.control === "number" ? "number" : "text"}
          onChange={(event) => onApply(event.target.value)}
        />
      )}
      {field.description ? <p className="inspector__muted">{field.description}</p> : null}
    </div>
  );
}

export function ConfigInspector({
  configSchema,
  selectedScopeId,
  template,
  payload,
  tokenPresets,
  onChange,
}: Props) {
  if (!configSchema) {
    return (
      <aside className="side-inspector">
        <h2 className="side-panel__title">配置项</h2>
        <p className="inspector__muted">当前邮件目录下没有 configSchema.json，可先通过迁移脚本生成。</p>
      </aside>
    );
  }

  const scopes = selectedScopeId
    ? configSchema.scopes.filter((scope) => scope.scopeId === selectedScopeId)
    : configSchema.scopes;

  return (
    <aside className="side-inspector">
      <h2 className="side-panel__title">配置项</h2>
      {scopes.map((scope) => (
        <section className="theme-inspector__block" key={scope.scopeId}>
          <h3 className="theme-inspector__block-title">{scope.label}</h3>
          {scope.description ? <p className="inspector__muted">{scope.description}</p> : null}
          {scope.fields.length === 0 ? (
            <p className="inspector__muted">这个作用域暂未开放配置项。</p>
          ) : (
            scope.fields.map((field) => (
              <ConfigFieldEditor
                key={field.key}
                scope={scope}
                field={field}
                template={template}
                payload={payload}
                tokenPresets={tokenPresets}
                onApply={(value) => {
                  const next = applyConfigValue({ template, payload, tokenPresets }, scope, field, value);
                  onChange(next);
                }}
              />
            ))
          )}
        </section>
      ))}
    </aside>
  );
}
