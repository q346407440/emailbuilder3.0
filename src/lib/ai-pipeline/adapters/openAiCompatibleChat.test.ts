import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  OpenAiChatCompletionsError,
  postOpenAiChatCompletionsOnce,
} from "./openAiCompatibleChat";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("postOpenAiChatCompletionsOnce 发送 OpenAI 兼容 body 且不含厂商扩展", async () => {
  let capturedBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const content = await postOpenAiChatCompletionsOnce(
    { apiKey: "k", baseUrl: "https://example.com/v1", model: "m" },
    { model: "m", messages: [{ role: "user", content: "hi" }] },
    { timeoutMs: 5000, vendorLabel: "测试" }
  );

  assert.equal(content, '{"ok":true}');
  assert.deepEqual(capturedBody, {
    model: "m",
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal("thinking" in (capturedBody ?? {}), false);
});

test("postOpenAiChatCompletionsOnce augmentBaseBody 仅追加厂商字段", async () => {
  let capturedBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
      { status: 200 }
    );
  };

  await postOpenAiChatCompletionsOnce(
    { apiKey: "k", baseUrl: "https://example.com/v1/", model: "m" },
    { model: "m", messages: [{ role: "user", content: "hi" }] },
    {
      timeoutMs: 5000,
      vendorLabel: "豆包",
      augmentBaseBody: () => ({ thinking: { type: "disabled" } }),
    },
    { response_format: { type: "json_object" } }
  );

  assert.deepEqual(capturedBody?.thinking, { type: "disabled" });
  assert.deepEqual(capturedBody?.response_format, { type: "json_object" });
});

test("postOpenAiChatCompletionsOnce 非 2xx 抛出带 status 的错误", async () => {
  globalThis.fetch = async () =>
    new Response("rate limited", { status: 429, statusText: "Too Many Requests" });

  await assert.rejects(
    () =>
      postOpenAiChatCompletionsOnce(
        { apiKey: "k", baseUrl: "https://example.com/v1", model: "m" },
        { model: "m", messages: [{ role: "user", content: "hi" }] },
        { timeoutMs: 5000, vendorLabel: "测试" }
      ),
    (e: unknown) => {
      assert.ok(e instanceof OpenAiChatCompletionsError);
      assert.equal(e.status, 429);
      return true;
    }
  );
});
