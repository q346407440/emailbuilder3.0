/** AI 管线：厂商 → 模型 → thinking 配置（UI 与 server 校验同源）。 */

export const LLM_PIPELINE_VENDORS = ["doubao", "gemini"] as const;
export type LlmPipelineVendor = (typeof LLM_PIPELINE_VENDORS)[number];

export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";
export type DoubaoThinkingType = "enabled" | "disabled";
/** 豆包 Seed 2.0 catalog 模型在 Chat API 上的 reasoning_effort 档位。 */
export type DoubaoReasoningEffort = "minimal" | "low" | "medium" | "high";
/** @deprecated 使用 DoubaoThinkingType / DoubaoReasoningEffort */
export type DoubaoThinkingMode = DoubaoThinkingType;

export type LlmThinkingOption = {
  value: string;
  label: string;
  default?: boolean;
};

export type LlmModelOption = {
  id: string;
  label: string;
};

export type LlmVendorOption = {
  id: LlmPipelineVendor;
  label: string;
};

/** 用户在一次「以图创建」中选择的 LLM 配置（厂商 / 模型 / thinking）。不含方案 2 的 json_schema 开关。 */
export type LlmProfileSelection = {
  vendor: LlmPipelineVendor;
  model: string;
  thinking: string;
};

export const LLM_VENDOR_OPTIONS: readonly LlmVendorOption[] = [
  { id: "doubao", label: "豆包" },
  { id: "gemini", label: "Gemini" },
] as const;

export const GEMINI_MODEL_CATALOG: readonly LlmModelOption[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
] as const;

/** 以图还原弹窗可选豆包模型（须与方舟控制台可用 model id 一致）。 */
export const DOUBAO_MODEL_CATALOG: readonly LlmModelOption[] = [
  { id: "doubao-seed-2-0-pro-260215", label: "Doubao Seed 2.0 Pro" },
  { id: "doubao-seed-2-0-lite-260428", label: "Doubao Seed 2.0 Lite" },
] as const;

/** RestoreAst 方案 2 下支持豆包 response_format.json_schema 的模型（与 DOUBAO_MODEL_CATALOG 同步维护）。 */
export const DOUBAO_JSON_SCHEMA_MODEL_IDS: readonly string[] = DOUBAO_MODEL_CATALOG.map(
  (model) => model.id
);

/** 豆包 Seed 2.0（catalog 两模型）：thinking enabled + reasoning_effort 四档（默认 low）。 */
export const DOUBAO_SEED_20_REASONING_EFFORT_OPTIONS: readonly LlmThinkingOption[] = [
  { value: "minimal", label: "minimal" },
  { value: "low", label: "low", default: true },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
] as const;

/** catalog 外 endpoint（如 ep-xxx）：保持关闭 thinking。 */
export const DOUBAO_LEGACY_THINKING_OPTIONS: readonly LlmThinkingOption[] = [
  { value: "disabled", label: "关闭", default: true },
] as const;

/** @deprecated 使用 getThinkingOptionsForModel("doubao", modelId) */
export const DOUBAO_THINKING_OPTIONS: readonly LlmThinkingOption[] = DOUBAO_LEGACY_THINKING_OPTIONS;

/** Gemini 3.5 Flash / 3.1 Flash Lite 官方 thinkingLevel 档位（默认 low，见 gemini3.5flash 文档）。 */
export const GEMINI_35_FLASH_THINKING_OPTIONS: readonly LlmThinkingOption[] = [
  { value: "minimal", label: "minimal" },
  { value: "low", label: "low", default: true },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
] as const;

/** Gemini 3.1 Pro Preview：low / medium / high（默认 low）。 */
export const GEMINI_31_PRO_THINKING_OPTIONS: readonly LlmThinkingOption[] = [
  { value: "low", label: "low", default: true },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
] as const;

/** Gemini 3.1 Flash Lite：与 3.5 Flash 相同四档（默认 low）。 */
export const GEMINI_31_FLASH_LITE_THINKING_OPTIONS: readonly LlmThinkingOption[] =
  GEMINI_35_FLASH_THINKING_OPTIONS;

export function llmModelProfileKey(vendor: LlmPipelineVendor, modelId: string): string {
  return `${vendor}:${modelId}`;
}

export function isDoubaoSeed20CatalogModel(modelId: string): boolean {
  const normalized = modelId.trim();
  return DOUBAO_MODEL_CATALOG.some((model) => model.id === normalized);
}

export function getThinkingOptionsForModel(
  vendor: LlmPipelineVendor,
  modelId: string
): readonly LlmThinkingOption[] {
  if (vendor === "doubao") {
    if (isDoubaoSeed20CatalogModel(modelId)) {
      return DOUBAO_SEED_20_REASONING_EFFORT_OPTIONS;
    }
    return DOUBAO_LEGACY_THINKING_OPTIONS;
  }
  if (vendor !== "gemini") {
    return [];
  }
  switch (modelId) {
    case "gemini-3.5-flash":
      return GEMINI_35_FLASH_THINKING_OPTIONS;
    case "gemini-3.1-pro-preview":
      return GEMINI_31_PRO_THINKING_OPTIONS;
    case "gemini-3.1-flash-lite":
      return GEMINI_31_FLASH_LITE_THINKING_OPTIONS;
    default:
      return [];
  }
}

export function getDefaultThinkingForModel(
  vendor: LlmPipelineVendor,
  modelId: string
): string {
  const options = getThinkingOptionsForModel(vendor, modelId);
  return options.find((o) => o.default)?.value ?? options[0]?.value ?? "";
}

export function parseLlmPipelineVendor(raw: string | undefined | null): LlmPipelineVendor | null {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "doubao" || normalized === "gemini") return normalized;
  return null;
}

export type BuildLlmProfileOptionsInput = {
  /** 已配置 DOUBAO_API_KEY + LLM_PIPELINE_MODEL */
  doubaoConfigured: boolean;
  /** .env 中 LLM_PIPELINE_MODEL，用于默认选中与 catalog 外 endpoint 合并 */
  doubaoEnvModelId: string | null;
  geminiConfigured: boolean;
};

function buildDoubaoModelOptions(envModelId: string | null | undefined): LlmModelOption[] {
  const models: LlmModelOption[] = [...DOUBAO_MODEL_CATALOG];
  const envId = envModelId?.trim() ?? "";
  if (envId && !models.some((model) => model.id === envId)) {
    models.unshift({ id: envId, label: envId });
  }
  return models;
}

function resolveDoubaoDefaultModelId(
  doubaoModels: readonly LlmModelOption[],
  envModelId: string | null | undefined
): string {
  const envId = envModelId?.trim() ?? "";
  if (envId && doubaoModels.some((model) => model.id === envId)) {
    return envId;
  }
  return doubaoModels[0]?.id ?? "";
}

export type LlmProfileOptionsPayload = {
  vendors: LlmVendorOption[];
  modelsByVendor: Record<LlmPipelineVendor, LlmModelOption[]>;
  thinkingByModelKey: Record<string, LlmThinkingOption[]>;
  defaults: LlmProfileSelection;
  availability: Record<LlmPipelineVendor, boolean>;
};

/** 供 GET /api/v1/ai-pipeline/llm-options 与前端弹窗使用。 */
export function buildLlmProfileOptions(input: BuildLlmProfileOptionsInput): LlmProfileOptionsPayload {
  const doubaoModels: LlmModelOption[] = input.doubaoConfigured
    ? buildDoubaoModelOptions(input.doubaoEnvModelId)
    : [];

  const modelsByVendor: Record<LlmPipelineVendor, LlmModelOption[]> = {
    doubao: doubaoModels,
    gemini: input.geminiConfigured ? [...GEMINI_MODEL_CATALOG] : [],
  };

  const thinkingByModelKey: Record<string, LlmThinkingOption[]> = {};
  for (const m of doubaoModels) {
    thinkingByModelKey[llmModelProfileKey("doubao", m.id)] = [
      ...getThinkingOptionsForModel("doubao", m.id),
    ];
  }
  if (input.geminiConfigured) {
    for (const m of GEMINI_MODEL_CATALOG) {
      thinkingByModelKey[llmModelProfileKey("gemini", m.id)] = [
        ...getThinkingOptionsForModel("gemini", m.id),
      ];
    }
  }

  const defaultVendor: LlmPipelineVendor = doubaoModels.length > 0 ? "doubao" : "gemini";
  const defaultModel =
    defaultVendor === "doubao"
      ? resolveDoubaoDefaultModelId(doubaoModels, input.doubaoEnvModelId)
      : (GEMINI_MODEL_CATALOG[0]?.id ?? "");

  return {
    vendors: [...LLM_VENDOR_OPTIONS],
    modelsByVendor,
    thinkingByModelKey,
    defaults: {
      vendor: defaultVendor,
      model: defaultModel,
      thinking: getDefaultThinkingForModel(defaultVendor, defaultModel),
    },
    availability: {
      doubao: input.doubaoConfigured,
      gemini: input.geminiConfigured,
    },
  };
}

export type ValidateLlmProfileResult =
  | { ok: true; profile: LlmProfileSelection }
  | { ok: false; message: string };

/** 校验用户提交的 LLM 配置（与 buildLlmProfileOptions 产出一致）。 */
export function validateLlmProfileSelection(
  raw: { vendor?: string; model?: string; thinking?: string },
  optionsPayload: LlmProfileOptionsPayload
): ValidateLlmProfileResult {
  const vendor = parseLlmPipelineVendor(raw.vendor);
  if (!vendor) {
    return { ok: false, message: "无效的模型厂商" };
  }
  if (!optionsPayload.availability[vendor]) {
    return { ok: false, message: `模型厂商「${vendor}」未配置 API 密钥` };
  }

  const model = raw.model?.trim() ?? "";
  if (!model) {
    return { ok: false, message: "请选择模型" };
  }

  const allowedModels = optionsPayload.modelsByVendor[vendor] ?? [];
  if (!allowedModels.some((m) => m.id === model)) {
    return { ok: false, message: `模型「${model}」不在允许列表中` };
  }

  const thinkingOptions =
    optionsPayload.thinkingByModelKey[llmModelProfileKey(vendor, model)] ?? [];
  const thinking = raw.thinking?.trim() ?? "";
  if (!thinking) {
    return { ok: false, message: "请选择 thinking 档位" };
  }
  if (!thinkingOptions.some((o) => o.value === thinking)) {
    return { ok: false, message: `thinking「${thinking}」对当前模型无效` };
  }

  return { ok: true, profile: { vendor, model, thinking } };
}

/** 切换厂商/模型时归一 thinking（保留合法值，否则用默认）。 */
export function coerceLlmProfileSelection(
  vendor: LlmPipelineVendor,
  model: string,
  thinking: string | undefined
): LlmProfileSelection {
  const options = getThinkingOptionsForModel(vendor, model);
  const normalized = thinking?.trim() ?? "";
  if (options.some((o) => o.value === normalized)) {
    return { vendor, model, thinking: normalized };
  }
  return {
    vendor,
    model,
    thinking: getDefaultThinkingForModel(vendor, model),
  };
}
