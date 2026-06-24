import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractGeminiStreamPayloads, parseGeminiStreamChunk } from "./geminiStream";

describe("parseGeminiStreamChunk", () => {
  it("解析 thought=true 与正文 content", () => {
    const deltas = parseGeminiStreamChunk(
      JSON.stringify({
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                { text: "分析布局", thought: true },
                { text: '{"theme":' },
              ],
            },
          },
        ],
      })
    );
    assert.deepEqual(deltas, [
      { channel: "think", text: "分析布局" },
      { channel: "content", text: '{"theme":' },
    ]);
  });

  it("thought 缺省或 false 时归入 content", () => {
    const deltas = parseGeminiStreamChunk(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "hello" }] } }],
      })
    );
    assert.deepEqual(deltas, [{ channel: "content", text: "hello" }]);
  });
});

describe("extractGeminiStreamPayloads", () => {
  it("解析 SSE data: 行", () => {
    assert.deepEqual(extractGeminiStreamPayloads('data: {"candidates":[]}'), ['{"candidates":[]}']);
  });

  it("兼容 NDJSON 行", () => {
    assert.deepEqual(extractGeminiStreamPayloads('{"candidates":[]}'), ['{"candidates":[]}']);
  });
});
