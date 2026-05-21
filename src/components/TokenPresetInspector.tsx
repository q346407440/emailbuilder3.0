import type { TokenPresets } from "../types/tokenPreset";
import { coercePersistedFontFamily, EMAIL_FONT_FAMILY_OPTIONS } from "../font-family-contract";
import { tokenPresetFieldLabelZh, tokenPresetFamilyTitleZh, tokenPresetScaleTitleKnown } from "../lib/tokenPresetFieldLabels";
import { sortTokenPresetFamilies, sortTokenPresetScales } from "../lib/tokenPresetStandardOrder";
import { tokenPresetFieldUsesShopUnitInput } from "../lib/tokenPresetFieldInput";
import { ColorField } from "./ui/ColorField";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect, ShopUnitInput } from "./ui/ShopFormControls";

type Props = {
  tokenPresets: TokenPresets | null;
  dirty: boolean;
  onChange: (next: TokenPresets) => void;
  onSave: () => void;
  /** 当前编辑来源说明（如「本邮件」或「公共 · xxx」） */
  editingSourceHint?: string;
  /** 设为打开本模板时默认选中的侧栏预设（写入 meta.json） */
  onSetAsTemplateDefault?: () => void | Promise<void>;
  /** 当前侧栏选中项已是模板 meta 中的默认 */
  isTemplateDefaultForCurrentSelection?: boolean;
  /** 禁用「设为模板默认预设」 */
  setAsTemplateDefaultDisabled?: boolean;
};

export function TokenPresetInspector({
  tokenPresets,
  dirty,
  onChange,
  onSave,
  editingSourceHint,
  onSetAsTemplateDefault,
  isTemplateDefaultForCurrentSelection,
  setAsTemplateDefaultDisabled,
}: Props) {
  if (!tokenPresets) {
    return (
      <aside className="side-inspector side-inspector--token-preset">
        <div className="side-inspector__headrow">
          <h2 className="side-panel__title">样式预设</h2>
        </div>
        <p className="inspector__muted">当前邮件目录下没有 tokenPresets.json，可先通过迁移脚本生成。</p>
      </aside>
    );
  }

  const active = tokenPresets.presets[tokenPresets.activePresetId] ?? Object.values(tokenPresets.presets)[0];
  const activeId = tokenPresets.presets[tokenPresets.activePresetId]
    ? tokenPresets.activePresetId
    : Object.keys(tokenPresets.presets)[0] ?? "";

  const patchToken = (family: string, scale: string, value: string) => {
    const next = structuredClone(tokenPresets);
    const preset = next.presets[activeId];
    if (!preset) return;
    preset.tokens[family] = { ...(preset.tokens[family] ?? {}), [scale]: value };
    onChange(next);
  };

  return (
    <aside className="side-inspector side-inspector--token-preset">
      <div className="side-inspector__headrow">
        <div>
          <h2 className="side-panel__title">样式预设</h2>
          {editingSourceHint ? (
            <p className="inspector__muted" style={{ marginTop: 4, marginBottom: 0 }}>
              {editingSourceHint}
            </p>
          ) : null}
        </div>
        <div className="side-inspector__headrow-actions" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
          <ShopPrimaryButton size="small" disabled={!dirty} onClick={onSave}>
            保存样式预设
          </ShopPrimaryButton>
          {onSetAsTemplateDefault ? (
            <ShopSecondaryButton
              size="small"
              htmlType="button"
              disabled={Boolean(setAsTemplateDefaultDisabled) || Boolean(isTemplateDefaultForCurrentSelection)}
              onClick={() => void onSetAsTemplateDefault()}
              title={isTemplateDefaultForCurrentSelection ? "当前选中项已是模板默认" : undefined}
            >
              {isTemplateDefaultForCurrentSelection ? "已是模板默认" : "设为模板默认预设"}
            </ShopSecondaryButton>
          ) : null}
        </div>
      </div>
      <div className="side-inspector__token-scroll">
        {active ? (
          <div className="side-summary">
            {sortTokenPresetFamilies(Object.keys(active.tokens)).map((family) => {
              const scales = active.tokens[family] ?? {};
              const scaleEntries = sortTokenPresetScales(family, Object.keys(scales)).map((scale) => [
                scale,
                scales[scale],
              ] as const);
              const unknownOrdinalByScale = new Map<string, number>();
              let unknownCount = 0;
              for (const [sc] of scaleEntries) {
                if (!tokenPresetScaleTitleKnown(family, sc)) {
                  unknownCount += 1;
                  unknownOrdinalByScale.set(sc, unknownCount);
                }
              }
              return (
              <section className="theme-inspector__block" key={family}>
                <h3 className="theme-inspector__block-title">{tokenPresetFamilyTitleZh(family)}</h3>
                {scaleEntries.map(([scale, value]) => {
                  const str = String(value ?? "");
                  const useUnit = tokenPresetFieldUsesShopUnitInput(family, str);
                  const uo = unknownOrdinalByScale.get(scale) ?? 1;
                  const { label, technicalHint } = tokenPresetFieldLabelZh(family, scale, uo);
                  if (family === "colors") {
                    return (
                      <ColorField
                        key={`${family}.${scale}`}
                        label={label}
                        value={str}
                        onChange={(next) => patchToken(family, scale, next)}
                        {...(technicalHint ? { hint: technicalHint } : {})}
                      />
                    );
                  }
                  if (family === "fonts") {
                    const selectValue = coercePersistedFontFamily(str);
                    return (
                      <div className="inspector__field" key={`${family}.${scale}`}>
                        <label className="inspector__label" title={technicalHint}>
                          {label}
                        </label>
                        <ShopSelect
                          value={selectValue}
                          onChange={(next) =>
                            patchToken(family, scale, coercePersistedFontFamily(String(next)))
                          }
                        >
                          {EMAIL_FONT_FAMILY_OPTIONS.map((opt) => (
                            <ShopSelect.Option key={opt.value} value={opt.value}>
                              {opt.label}
                            </ShopSelect.Option>
                          ))}
                        </ShopSelect>
                      </div>
                    );
                  }
                  return (
                    <div className="inspector__field" key={`${family}.${scale}`}>
                      <label className="inspector__label" title={technicalHint}>
                        {label}
                      </label>
                      {useUnit ? (
                        <ShopUnitInput
                          value={str}
                          unit="px"
                          min={0}
                          step={family === "typography" ? 1 : 0.5}
                          onChange={(next) => patchToken(family, scale, next)}
                        />
                      ) : (
                        <ShopInput
                          type="text"
                          value={str}
                          onChange={(event) => patchToken(family, scale, event.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </section>
              );
            })}
          </div>
        ) : null}
        <p className="inspector__muted">普通用户优先选择“跟随/大中小”，这里用于维护档位背后的真实值。</p>
      </div>
    </aside>
  );
}
