import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOpenAiStreamChunk } from "./openAiCompatibleChatStream";

describe("parseOpenAiStreamChunk", () => {
  it("解析 reasoning_content 与 content delta", () => {
    const deltas = parseOpenAiStreamChunk(
      JSON.stringify({
        choices: [{ delta: { reasoning_content: "思考", content: "{" } }],
      })
    );
    assert.deepEqual(deltas, [
      { channel: "think", text: "思考" },
      { channel: "content", text: "{" },
    ]);
  });

  it("忽略空 delta", () => {
    assert.deepEqual(parseOpenAiStreamChunk(JSON.stringify({ choices: [{}] })), []);
  });
});
