import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeLlmExchangeBodyForLog } from "./llmExchangeFileLog";

describe("sanitizeLlmExchangeBodyForLog", () => {
  it("将 messages 中的 data URL 图片替换为占位符", () => {
    const body = {
      model: "test-model",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "分析设计图" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,QUJDREVGRw==" },
            },
          ],
        },
      ],
    };
    const sanitized = sanitizeLlmExchangeBodyForLog(body) as typeof body;
    const url = (sanitized.messages[0].content as Array<{ image_url?: { url: string } }>)[1]
      ?.image_url?.url;
    assert.match(url ?? "", /^<data-url:image\/png;base64,/);
    assert.match(url ?? "", /omitted>/);
    assert.doesNotMatch(url ?? "", /QUJDREVGRw==/);
  });

  it("保留普通文本与 http 图片 URL", () => {
    const body = {
      messages: [
        {
          role: "user",
          content: "hello",
        },
        {
          type: "image_url",
          image_url: { url: "https://example.com/a.png" },
        },
      ],
    };
    assert.deepEqual(sanitizeLlmExchangeBodyForLog(body), body);
  });
});
