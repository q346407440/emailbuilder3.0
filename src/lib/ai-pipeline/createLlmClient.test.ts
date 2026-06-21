import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createLlmClientFromProfile } from "./createLlmClient";

const prevGeminiKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (prevGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = prevGeminiKey;
});

test("createLlmClientFromProfile gemini 未配置 API key 时 complete 抛错", async () => {
  delete process.env.GEMINI_API_KEY;
  const client = createLlmClientFromProfile({
    vendor: "gemini",
    model: "gemini-3.5-flash",
    thinking: "low",
  });
  await assert.rejects(
    () => client.complete([{ role: "user", content: "hi" }]),
    /GEMINI_API_KEY/
  );
});
