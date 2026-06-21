import { memo, useEffect, useState } from "react";
import type { TokenPresets } from "../types/tokenPreset";
import { logicalDeleteConfirmOptions } from "../lib/logicalDeleteConfirm";
import { tokenPresetFieldLabelZh, tokenPresetFamilyTitleZh, tokenPresetScaleTitleKnown } from "../lib/tokenPresetFieldLabels";
import { sortTokenPresetFamilies, sortTokenPresetScales } from "../token-preset-contract/standard-keys";
import { tokenPresetFieldUsesShopUnitInput } from "../lib/tokenPresetFieldInput";
import { ColorField } from "./ui/ColorField";
import { Field } from "./ui/Field";
import { InspectorPanelSection } from "./ui/InspectorPanelSection";
import { ShopInput, ShopUnitInput } from "./ui/ShopFormControls";
import { useConfirmDialog } from "./ui/ConfirmDialogProvider";

type Props = {
  tokenPresets: TokenPresets | null;
  dirty: boolean;
  /** 与左侧列表一致：`local` 为邮件内预设；否则为公共预设 presetId */
  listSelection: "local" | string;
  onChange: (next: TokenPresets) => void;
  onSave: () => void;
  /** 设为打开本模板时默认选中的侧栏预设（写入 meta.json） */
  onSetAsTemplateDefault?: () => void | Promise<void>;
  /** 当前侧栏选中项已是模板 meta 中的默认 */
  isTemplateDefaultForCurrentSelection?: boolean;
  /** 禁用「设为模板默认预设」 */
  setAsTemplateDefaultDisabled?: boolean;
  /** 逻辑删除当前选中的公共预设（仅 listSelection 非 local 时展示删除） */
  onDeleteGlobal?: (presetId: string) => void | Promise<void>;
  validationError?: string;
  validationWarning?: string;
};

/** 样式预设 Inspector：颜色四列；间距/字号/圆角双列；未知分组单列 */
function tokenPresetSectionLayout(family: string): "1col" | "2col" | "4col" {
  if (family === "colors") return "4col";
  if (family === "spacing" || family === "typography" || family === "radius") return "2col";
  return "1col";
}

function TokenPresetInspectorImpl({
  tokenPresets,
  dirty,
  listSelection,
  onChange,
  onSave,
  onSetAsTemplateDefault,
  isTemplateDefaultForCurrentSelection,
  setAsTemplateDefaultDisabled,
  onDeleteGlobal,
  validationError,
  validationWarning,
}: Props) {
  const { confirm } = useConfirmDialog();
  if (!tokenPresets) {
    return (
      <aside className="inspector inspector--token-preset">
        <div className="inspector__title-row">
          <h2 className="inspector__title">样式预设</h2>
        </div>
        <p className="inspector__muted">当前邮件尚未配置样式预设。</p>
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

  const patchPresetLabel = (nextLabel: string) => {
    const next = structuredClone(tokenPresets);
    const preset = next.presets[activeId];
    if (!preset) return;
    preset.label = nextLabel;
    onChange(next);
  };

  const isGlobalSelection = listSelection !== "local";
  const globalPresetId = isGlobalSelection ? listSelection : null;
  const headTitle = active?.label?.trim() || activeId || "样式预设";
  const [titleDraft, setTitleDraft] = useState(headTitle);

  useEffect(() => {
    setTitleDraft(headTitle);
  }, [headTitle]);

  const handleDeleteGlobal = async () => {
    if (!globalPresetId || !onDeleteGlobal) return;
    const ok = await confirm(
      logicalDeleteConfirmOptions({
        kind: "globalTokenPreset",
        name: headTitle,
      })
    );
    if (ok) void onDeleteGlobal(globalPresetId);
  };

  const commitTitle = () => {
    const current = headTitle.trim();
    const next = titleDraft.trim();
    const normalized = next.length > 0 ? next : activeId;
    if (!normalized || normalized === current) {
      setTitleDraft(current);
      return;
    }
    patchPresetLabel(normalized);
  };

  return (
    <aside className="inspector inspector--token-preset">
      <header className="token-preset-inspector__header">
        {validationError ? (
          <p className="inspector-field__message inspector-field__message--error" role="alert">
            {validationError}
          </p>
        ) : validationWarning ? (
          <p className="inspector-field__message inspector-field__message--warn">{validationWarning}</p>
        ) : null}
        <div className="side-inspector__headrow token-preset-inspector__headrow">
          <ShopInput
            value={titleDraft}
            className="inspector__title-input"
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                (event.currentTarget as HTMLInputElement).blur();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setTitleDraft(headTitle);
                (event.currentTarget as HTMLInputElement).blur();
              }
            }}
            aria-label="预设名称"
            placeholder={activeId || "样式预设"}
          />
          <div className="token-preset-inspector__head-actions">
            <button
              type="button"
              className="resource-text-action"
              disabled={!dirty}
              onClick={onSave}
              title="保存当前样式预设改动"
            >
              保存
            </button>
            {onSetAsTemplateDefault ? (
              <button
                type="button"
                className="resource-text-action"
                disabled={Boolean(setAsTemplateDefaultDisabled) || Boolean(isTemplateDefaultForCurrentSelection)}
                onClick={() => void onSetAsTemplateDefault()}
                title={isTemplateDefaultForCurrentSelection ? "当前选中项已是模板默认" : "将当前预设设为模板默认"}
              >
                {isTemplateDefaultForCurrentSelection ? "已是模板默认" : "设为模板默认"}
              </button>
            ) : null}
            {isGlobalSelection && onDeleteGlobal ? (
              <button
                type="button"
                className="resource-text-action resource-text-action--danger"
                onClick={() => void handleDeleteGlobal()}
                title="逻辑删除该公共样式预设文件"
              >
                删除
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <div className="inspector__token-scroll">
        {active ? (
          <>
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
              const layout = tokenPresetSectionLayout(family);
              const sectionClass = `inspector__section token-preset-inspector__section token-preset-inspector__section--${layout}`;

              return (
                <InspectorPanelSection
                  key={family}
                  title={tokenPresetFamilyTitleZh(family)}
                  className="token-preset-inspector__group"
                  bodyClassName={sectionClass}
                >
                  {scaleEntries.map(([scale, value]) => {
                    const str = String(value ?? "");
                    const useUnit = tokenPresetFieldUsesShopUnitInput(family, str);
                    const uo = unknownOrdinalByScale.get(scale) ?? 1;
                    const { label } = tokenPresetFieldLabelZh(family, scale, uo);
                    if (family === "colors") {
                      return (
                        <ColorField
                          key={`${family}.${scale}`}
                          label={label}
                          value={str}
                          onChange={(next) => patchToken(family, scale, next)}
                        />
                      );
                    }
                    return (
                      <Field
                        key={`${family}.${scale}`}
                        label={label}
                      >
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
                      </Field>
                    );
                  })}
                </InspectorPanelSection>
              );
            })}
          </>
        ) : null}
      </div>
    </aside>
  );
}

export const TokenPresetInspector = memo(TokenPresetInspectorImpl);
