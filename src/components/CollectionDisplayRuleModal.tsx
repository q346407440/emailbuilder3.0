import { useEffect, useRef, useState } from "react";
import type { CollectionDisplayRule } from "../payload-contract/types";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { Field } from "./ui/Field";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton, ShopSelect, ShopTextArea } from "./ui/ShopFormControls";
import type { BindingCollectionField } from "../types/email";

type Props = {
  visible: boolean;
  slotId: string;
  slotLabel?: string;
  rule?: CollectionDisplayRule;
  itemFields: BindingCollectionField[];
  includePresetValues?: string[];
  includePresetOptions?: Array<{ value: string; label: string }>;
  keyFieldPreset?: string;
  scenePresetManaged?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onApply: (rule: CollectionDisplayRule | undefined) => void;
};

function parseRuleValues(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(/[\n,，]/g)) {
    const value = token.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function CollectionDisplayRuleModal({
  visible,
  slotId,
  slotLabel,
  rule,
  itemFields,
  includePresetValues = [],
  includePresetOptions = [],
  keyFieldPreset,
  scenePresetManaged = false,
  disabled,
  onClose,
  onApply,
}: Props) {
  const [keyField, setKeyField] = useState("type");
  const [includeDraft, setIncludeDraft] = useState("");
  const [excludeDraft, setExcludeDraft] = useState("");
  const [includeSelected, setIncludeSelected] = useState<string[]>([]);
  const [excludeSelected, setExcludeSelected] = useState<string[]>([]);
  const wasVisibleRef = useRef(false);
  const previousKeyFieldRef = useRef<string | null>(null);

  const keyFieldOptions = itemFields.map((field) => ({
    value: field.key,
    label: `${field.label || field.key}（${field.key}）`,
  }));
  const includeOptionMap = new Map<string, string>();
  for (const option of includePresetOptions) {
    const value = String(option.value ?? "").trim();
    const label = String(option.label ?? "").trim();
    if (!value || !label || includeOptionMap.has(value)) continue;
    includeOptionMap.set(value, label);
  }
  for (const value of [...includePresetValues, ...(rule?.includeValues ?? []), ...(rule?.excludeValues ?? [])]) {
    const v = String(value ?? "").trim();
    if (!v || includeOptionMap.has(v)) continue;
    includeOptionMap.set(v, v);
  }
  const includeOptions = Array.from(includeOptionMap.entries()).map(([value, label]) => ({
    value,
    label,
  }));
  const presetKeyField = keyFieldPreset?.trim() || "";
  const usePresetSelect = scenePresetManaged && keyField === presetKeyField && includeOptions.length > 0;

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;
    const defaultKeyField =
      rule?.keyField?.trim() ||
      keyFieldPreset?.trim() ||
      keyFieldOptions[0]?.value ||
      "type";
    setKeyField(defaultKeyField);
    setIncludeDraft((rule?.includeValues ?? []).join("\n"));
    setExcludeDraft((rule?.excludeValues ?? []).join("\n"));
    setIncludeSelected(rule?.includeValues ?? includePresetValues);
    setExcludeSelected(rule?.excludeValues ?? []);
    previousKeyFieldRef.current = defaultKeyField;
  }, [includePresetValues, keyFieldOptions, keyFieldPreset, rule, visible]);

  useEffect(() => {
    if (!visible) return;
    const previousKey = previousKeyFieldRef.current;
    if (previousKey === null || previousKey === keyField) return;
    if (scenePresetManaged && previousKey === presetKeyField && keyField !== presetKeyField) {
      setIncludeDraft("");
      setExcludeDraft("");
      setIncludeSelected([]);
      setExcludeSelected([]);
    }
    previousKeyFieldRef.current = keyField;
  }, [keyField, presetKeyField, scenePresetManaged, visible]);

  const handleApply = () => {
    const includeValues = usePresetSelect
      ? includeSelected.map((v) => String(v).trim()).filter(Boolean)
      : parseRuleValues(includeDraft);
    const excludeValues = usePresetSelect
      ? excludeSelected.map((v) => String(v).trim()).filter(Boolean)
      : parseRuleValues(excludeDraft);
    const trimmedKeyField = keyField.trim();
    const nextRule: CollectionDisplayRule | undefined =
      !trimmedKeyField && includeValues.length === 0 && excludeValues.length === 0
        ? undefined
        : {
            ...(trimmedKeyField ? { keyField: trimmedKeyField } : {}),
            ...(includeValues.length > 0 ? { includeValues } : {}),
            ...(excludeValues.length > 0 ? { excludeValues } : {}),
          };
    onApply(nextRule);
    onClose();
  };

  const displayLabel = slotLabel?.trim() || slotId;

  return (
    <ShopSectionModal
      title="列表展示规则"
      visible={visible}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="collection-display-rule-modal-wrap shop-section-modal-wrap"
      onCancel={onClose}
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" disabled={disabled} onClick={handleApply}>
            确定
          </ShopPrimaryButton>
        </div>
      }
    >
      <div className="collection-display-rule-modal">
        <p className="collection-display-rule-modal__hint">
          列表变量 <code>{slotId}</code>
          {displayLabel !== slotId ? <>（{displayLabel}）</> : null}
          ：按规则从外部全量列表中投影出可展示子集（repeat 仅渲染命中项）。
        </p>
        <Field label="匹配字段">
          {keyFieldOptions.length > 0 ? (
            <ShopSelect value={keyField} onChange={(next) => setKeyField(String(next ?? ""))}>
              {keyFieldOptions.map((option) => (
                <ShopSelect.Option key={option.value} value={option.value}>
                  {option.label}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          ) : (
            <ShopInput value={keyField} onChange={(e) => setKeyField(e.target.value)} placeholder="type" />
          )}
        </Field>
        {usePresetSelect ? (
          <Field label="包含值（白名单）" hint="内置变量预设候选值；可多选">
            <ShopSelect
              mode="multiple"
              value={includeSelected}
              onChange={(next) => setIncludeSelected((next as string[]) ?? [])}
              placeholder="选择包含值"
            >
              {includeOptions.map((option) => (
                <ShopSelect.Option key={option.value} value={option.value}>
                  {option.label}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          </Field>
        ) : (
          <Field label="包含值（白名单）" hint="一行一个；留空表示不过滤">
            <ShopTextArea
              rows={4}
              value={includeDraft}
              onChange={(e) => setIncludeDraft(e.target.value)}
              placeholder={"points_threshold\nmax_discount"}
            />
          </Field>
        )}
        {usePresetSelect ? (
          <Field label="排除值（黑名单）" hint="内置变量预设候选值；可多选；在白名单之后生效">
            <ShopSelect
              mode="multiple"
              value={excludeSelected}
              onChange={(next) => setExcludeSelected((next as string[]) ?? [])}
              placeholder="选择排除值"
            >
              {includeOptions.map((option) => (
                <ShopSelect.Option key={option.value} value={option.value}>
                  {option.label}
                </ShopSelect.Option>
              ))}
            </ShopSelect>
          </Field>
        ) : (
          <Field label="排除值（黑名单）" hint="一行一个；在白名单之后生效">
            <ShopTextArea
              rows={3}
              value={excludeDraft}
              onChange={(e) => setExcludeDraft(e.target.value)}
              placeholder="legacy_rule"
            />
          </Field>
        )}
      </div>
    </ShopSectionModal>
  );
}
