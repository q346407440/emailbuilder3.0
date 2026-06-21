import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDoubaoChatCompletionsExtensions,
  doubaoRuntimeFromProfile,
} from "./doubaoClient";

test("buildDoubaoChatCompletionsExtensions Seed 2.0 传 enabled + reasoning_effort", () => {
  assert.deepEqual(
    buildDoubaoChatCompletionsExtensions({
      model: "doubao-seed-2-0-pro-260215",
      thinkingType: "enabled",
      reasoningEffort: "low",
    }),
    {
      thinking: { type: "enabled" },
      reasoning_effort: "low",
    }
  );
});

test("buildDoubaoChatCompletionsExtensions 非 catalog 模型传 disabled", () => {
  assert.deepEqual(
    buildDoubaoChatCompletionsExtensions({
      model: "ep-test-123",
      thinkingType: "disabled",
    }),
    { thinking: { type: "disabled" } }
  );
});

test("doubaoRuntimeFromProfile catalog 模型默认 low", () => {
  const runtime = doubaoRuntimeFromProfile({
    vendor: "doubao",
    model: "doubao-seed-2-0-lite-260428",
    thinking: "invalid",
  });
  assert.equal(runtime.thinkingType, "enabled");
  assert.equal(runtime.reasoningEffort, "low");
});

test("doubaoRuntimeFromProfile catalog 模型保留合法 reasoning_effort", () => {
  const runtime = doubaoRuntimeFromProfile({
    vendor: "doubao",
    model: "doubao-seed-2-0-pro-260215",
    thinking: "high",
  });
  assert.equal(runtime.reasoningEffort, "high");
});
