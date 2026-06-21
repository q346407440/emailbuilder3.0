import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LLM_GENERATION_PARAMS,
  mergeLlmGenerationParams,
  readDefaultLlmGenerationParams,
} from "./llmGenerationParams";
import { toGeminiGenerationFields, toOpenAiCompatibleGenerationFields } from "../lib/ai-pipeline/llmGenerationParamsApply";

test("mergeLlmGenerationParams 局部覆盖", () => {
  const merged = mergeLlmGenerationParams(DEFAULT_LLM_GENERATION_PARAMS, {
    maxOutputTokens: 4096,
  });
  assert.equal(merged.maxOutputTokens, 4096);
  assert.equal(merged.temperature, DEFAULT_LLM_GENERATION_PARAMS.temperature);
});

test("toOpenAiCompatibleGenerationFields 映射 top_p", () => {
  const fields = toOpenAiCompatibleGenerationFields(DEFAULT_LLM_GENERATION_PARAMS);
  assert.equal(fields.top_p, DEFAULT_LLM_GENERATION_PARAMS.topP);
  assert.equal(fields.max_tokens, DEFAULT_LLM_GENERATION_PARAMS.maxOutputTokens);
});

test("toGeminiGenerationFields 映射 topP", () => {
  const fields = toGeminiGenerationFields(DEFAULT_LLM_GENERATION_PARAMS);
  assert.equal(fields.topP, DEFAULT_LLM_GENERATION_PARAMS.topP);
});

test("readDefaultLlmGenerationParams 读取环境变量", () => {
  const prev = process.env.LLM_PIPELINE_MAX_OUTPUT_TOKENS;
  process.env.LLM_PIPELINE_MAX_OUTPUT_TOKENS = "12345";
  try {
    assert.equal(readDefaultLlmGenerationParams().maxOutputTokens, 12345);
  } finally {
    if (prev === undefined) delete process.env.LLM_PIPELINE_MAX_OUTPUT_TOKENS;
    else process.env.LLM_PIPELINE_MAX_OUTPUT_TOKENS = prev;
  }
});
