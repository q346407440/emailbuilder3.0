import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLlmProfileOptions,
  coerceLlmProfileSelection,
  DOUBAO_MODEL_CATALOG,
  getDefaultThinkingForModel,
  getThinkingOptionsForModel,
  validateLlmProfileSelection,
} from "./llmProfileCatalog";

test("buildLlmProfileOptions 豆包模型来自 catalog", () => {
  const payload = buildLlmProfileOptions({
    doubaoConfigured: true,
    doubaoEnvModelId: "doubao-seed-2-0-pro-260215",
    geminiConfigured: true,
  });
  assert.deepEqual(payload.modelsByVendor.doubao, [...DOUBAO_MODEL_CATALOG]);
  assert.equal(payload.defaults.vendor, "doubao");
  assert.equal(payload.defaults.model, "doubao-seed-2-0-pro-260215");
  assert.equal(payload.defaults.thinking, "low");
});

test("buildLlmProfileOptions 豆包 catalog 模型 reasoning_effort 默认 low", () => {
  const payload = buildLlmProfileOptions({
    doubaoConfigured: true,
    doubaoEnvModelId: "doubao-seed-2-0-lite-260428",
    geminiConfigured: false,
  });
  assert.deepEqual(
    payload.thinkingByModelKey["doubao:doubao-seed-2-0-lite-260428"]?.map((o) => o.value),
    ["minimal", "low", "medium", "high"]
  );
  assert.equal(payload.defaults.thinking, "low");
});

test("buildLlmProfileOptions 合并 catalog 外 env endpoint", () => {
  const payload = buildLlmProfileOptions({
    doubaoConfigured: true,
    doubaoEnvModelId: "ep-test-123",
    geminiConfigured: false,
  });
  assert.equal(payload.modelsByVendor.doubao[0]?.id, "ep-test-123");
  assert.equal(payload.defaults.model, "ep-test-123");
  assert.equal(payload.defaults.thinking, "disabled");
});

test("buildLlmProfileOptions 含 doubao-seed-2-0-lite-260428", () => {
  const payload = buildLlmProfileOptions({
    doubaoConfigured: true,
    doubaoEnvModelId: "doubao-seed-2-0-pro-260215",
    geminiConfigured: false,
  });
  assert.ok(
    payload.modelsByVendor.doubao.some((model) => model.id === "doubao-seed-2-0-lite-260428")
  );
});

test("Gemini 3.5 Flash thinking 默认 low", () => {
  assert.equal(getDefaultThinkingForModel("gemini", "gemini-3.5-flash"), "low");
});

test("Gemini 3.1 Pro Preview thinking 仅 low/medium/high，默认 low", () => {
  const options = getThinkingOptionsForModel("gemini", "gemini-3.1-pro-preview");
  assert.deepEqual(
    options.map((o) => o.value),
    ["low", "medium", "high"]
  );
  assert.equal(getDefaultThinkingForModel("gemini", "gemini-3.1-pro-preview"), "low");
});

test("Gemini 3.1 Flash Lite thinking 与 3.5 Flash 一致", () => {
  const lite = getThinkingOptionsForModel("gemini", "gemini-3.1-flash-lite");
  const flash = getThinkingOptionsForModel("gemini", "gemini-3.5-flash");
  assert.deepEqual(
    lite.map((o) => o.value),
    flash.map((o) => o.value)
  );
  assert.equal(getDefaultThinkingForModel("gemini", "gemini-3.1-flash-lite"), "low");
});

test("coerceLlmProfileSelection 从 Flash Lite 切到 Pro 时去掉 minimal", () => {
  const next = coerceLlmProfileSelection("gemini", "gemini-3.1-pro-preview", "minimal");
  assert.equal(next.thinking, "low");
});

test("buildLlmProfileOptions Gemini 模型按模型分配 thinking 档位", () => {
  const payload = buildLlmProfileOptions({
    doubaoConfigured: false,
    doubaoEnvModelId: null,
    geminiConfigured: true,
  });
  assert.equal(payload.modelsByVendor.gemini.length, 3);
  assert.deepEqual(
    payload.thinkingByModelKey["gemini:gemini-3.1-pro-preview"]?.map((o) => o.value),
    ["low", "medium", "high"]
  );
  assert.deepEqual(
    payload.thinkingByModelKey["gemini:gemini-3.1-flash-lite"]?.map((o) => o.value),
    ["minimal", "low", "medium", "high"]
  );
});

test("coerceLlmProfileSelection 切换模型时归一 thinking", () => {
  const next = coerceLlmProfileSelection("gemini", "gemini-3.5-flash", "invalid");
  assert.equal(next.thinking, "low");
});

test("validateLlmProfileSelection 拒绝未配置厂商", () => {
  const options = buildLlmProfileOptions({
    doubaoConfigured: true,
    doubaoEnvModelId: "doubao-seed-2-0-pro-260215",
    geminiConfigured: false,
  });
  const result = validateLlmProfileSelection(
    { vendor: "gemini", model: "gemini-3.5-flash", thinking: "low" },
    options
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /未配置/);
  }
});

test("validateLlmProfileSelection 接受 catalog 内 lite 模型", () => {
  const options = buildLlmProfileOptions({
    doubaoConfigured: true,
    doubaoEnvModelId: "doubao-seed-2-0-pro-260215",
    geminiConfigured: false,
  });
  const result = validateLlmProfileSelection(
    { vendor: "doubao", model: "doubao-seed-2-0-lite-260428", thinking: "medium" },
    options
  );
  assert.equal(result.ok, true);
});
