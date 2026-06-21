import assert from "node:assert/strict";
import { test } from "node:test";
import { convertLlmMessagesToGeminiRequest } from "./geminiClient";

test("convertLlmMessagesToGeminiRequest 拆分 system 与多模态 user", () => {
  const { systemInstruction, contents } = convertLlmMessagesToGeminiRequest([
    { role: "system", content: "你是助手" },
    {
      role: "user",
      content: [
        { type: "text", text: "看图" },
        { type: "image_url", image_url: { url: "data:image/png;base64,QUJD" } },
      ],
    },
  ]);

  assert.deepEqual(systemInstruction, { parts: [{ text: "你是助手" }] });
  assert.equal(contents.length, 1);
  assert.equal(contents[0]?.role, "user");
  const parts = contents[0]?.parts ?? [];
  assert.equal(parts[0]?.text, "看图");
  assert.deepEqual(parts[1]?.inline_data, { mime_type: "image/png", data: "QUJD" });
});
