import { useMemo } from "react";
import { Alert, Radio, Segmented, Select } from "antd";
import type {
  LlmProfileOptionsPayload,
  LlmProfileSelection,
  LlmPipelineVendor,
} from "../../layout-variant-ai-contract/llmProfileCatalog";
import {
  coerceLlmProfileSelection,
  llmModelProfileKey,
} from "../../layout-variant-ai-contract/llmProfileCatalog";
import { Field } from "./Field";

type LayoutVariantLlmProfileFieldsProps = {
  options: LlmProfileOptionsPayload | null;
  value: LlmProfileSelection;
  disabled?: boolean;
  onChange: (next: LlmProfileSelection) => void;
};

const VENDOR_UNAVAILABLE_HINT: Record<LlmPipelineVendor, string> = {
  doubao: "未配置 DOUBAO_API_KEY / LLM_PIPELINE_MODEL，请写入 .env 并重启 ./start.sh",
  gemini: "未配置 GEMINI_API_KEY，请写入 .env 并重启 ./start.sh",
};

export function LayoutVariantLlmProfileFields({
  options,
  value,
  disabled,
  onChange,
}: LayoutVariantLlmProfileFieldsProps) {
  const vendors = options?.vendors ?? [];

  const hasUnavailableVendor = useMemo(
    () => vendors.some((vendor) => options && !options.availability[vendor.id]),
    [options, vendors]
  );

  const models = options?.modelsByVendor[value.vendor] ?? [];

  const thinkingOptions =
    options?.thinkingByModelKey[llmModelProfileKey(value.vendor, value.model)] ?? [];

  const setVendor = (vendor: LlmPipelineVendor) => {
    if (!options?.availability[vendor]) return;
    const nextModels = options.modelsByVendor[vendor] ?? [];
    const nextModel = nextModels[0]?.id ?? "";
    onChange(coerceLlmProfileSelection(vendor, nextModel, undefined));
  };

  const setModel = (model: string) => {
    onChange(coerceLlmProfileSelection(value.vendor, model, value.thinking));
  };

  const setThinking = (thinking: string) => {
    onChange({ ...value, thinking });
  };

  if (!options || vendors.length === 0) {
    return (
      <Alert
        type="warning"
        showIcon
        title="未配置 LLM API 密钥"
        description="需 DOUBAO_API_KEY 或 GEMINI_API_KEY，写入 .env 后重启 ./start.sh"
      />
    );
  }

  return (
    <div className="layout-variant-create-modal__llm-fields">
      <Field label="模型厂商">
        <Radio.Group
          optionType="button"
          value={value.vendor}
          disabled={disabled}
          className="layout-variant-create-modal__vendor-radio"
          onChange={(e) => setVendor(e.target.value as LlmPipelineVendor)}
        >
          {vendors.map((vendor) => {
            const available = options.availability[vendor.id];
            return (
              <Radio.Button
                key={vendor.id}
                value={vendor.id}
                disabled={!available}
                title={available ? undefined : VENDOR_UNAVAILABLE_HINT[vendor.id]}
              >
                {vendor.label}
              </Radio.Button>
            );
          })}
        </Radio.Group>
      </Field>

      <Field label="模型">
        {models.length === 0 ? (
          <span className="layout-variant-create-modal__muted">暂无可用模型</span>
        ) : (
          <Select
            value={value.model}
            disabled={disabled || models.length <= 1}
            options={models.map((model) => ({
              value: model.id,
              label: model.label,
            }))}
            popupMatchSelectWidth
            onChange={setModel}
          />
        )}
      </Field>

      <Field label="Thinking">
        {thinkingOptions.length === 0 ? (
          <span className="layout-variant-create-modal__muted">—</span>
        ) : thinkingOptions.length === 1 ? (
          <span className="layout-variant-create-modal__thinking-fixed">{thinkingOptions[0].label}</span>
        ) : (
          <Segmented
            block
            disabled={disabled}
            value={value.thinking}
            options={thinkingOptions.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
            onChange={(next) => setThinking(String(next))}
          />
        )}
      </Field>

      {hasUnavailableVendor ? (
        <Alert
          type="warning"
          showIcon
          className="layout-variant-create-modal__llm-alert"
          title="部分厂商尚未就绪"
          description="灰色不可选项表示 API Key 未配置，请确认 .env 并重启 ./start.sh 后再选。"
        />
      ) : null}
    </div>
  );
}
