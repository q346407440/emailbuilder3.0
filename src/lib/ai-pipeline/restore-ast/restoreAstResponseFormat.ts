import type { LlmProfileSelection } from "../../../layout-variant-ai-contract/llmProfileCatalog";
import { DOUBAO_JSON_SCHEMA_MODEL_IDS } from "../../../layout-variant-ai-contract/llmProfileCatalog";
import type { LlmResponseFormat } from "../ports/LlmClient";
import {
  RESTORE_AST_JSON_SCHEMA_NAME,
  RESTORE_AST_LLM_JSON_SCHEMA,
} from "../schemas/restore-ast-llm-json-schema";

/** 方案 2（RestoreAst）豆包 json_schema 真源（非通用 LLM 配置；见 resolveRestoreAstLlmResponseFormat）。 */
export function getRestoreAstResponseFormat(): LlmResponseFormat {
  return {
    type: "json_schema",
    json_schema: {
      name: RESTORE_AST_JSON_SCHEMA_NAME,
      // 先用非严格模式：递归 AST schema 含 anyOf/$defs，严格模式易触发方舟语法不支持报错
      strict: false,
      schema: RESTORE_AST_LLM_JSON_SCHEMA,
    },
  };
}

export type RestoreAstStructuredOutputGate = {
  profile: LlmProfileSelection | undefined;
  /** 允许传 json_schema 的豆包模型号（默认 DOUBAO_JSON_SCHEMA_MODEL_IDS） */
  doubaoJsonSchemaModelIds?: readonly string[];
};

/**
 * 方案 2 管线专用：是否向 LLM 传入结构化输出参数。
 *
 * 同时满足才传豆包 `response_format.json_schema`：
 * 1. 方案 2（RestoreAst）— 由调用方保证只在 restore-ast 路径调用本函数
 * 2. 厂商为豆包，且模型号在允许列表内（默认 catalog 中 Seed 2.0 模型）
 *
 * Gemini 及其他情况不传（走 prompt + parseRestoreAstDocument），不属于弹窗「模型配置」层。
 */
export function resolveRestoreAstLlmResponseFormat(
  gate: RestoreAstStructuredOutputGate
): LlmResponseFormat | undefined {
  const profile = gate.profile;
  if (!profile || profile.vendor !== "doubao") {
    return undefined;
  }
  const allowedModels = gate.doubaoJsonSchemaModelIds ?? DOUBAO_JSON_SCHEMA_MODEL_IDS;
  const selectedModel = profile.model.trim();
  if (!selectedModel || !allowedModels.some((modelId) => modelId.trim() === selectedModel)) {
    return undefined;
  }
  return getRestoreAstResponseFormat();
}
