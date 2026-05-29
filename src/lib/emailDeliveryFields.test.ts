import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTestEmailSubject } from "./emailDeliveryFields";

describe("resolveTestEmailSubject", () => {
  it("有 subject 时原样返回", () => {
    assert.equal(
      resolveTestEmailSubject({ subject: "  正式主题  ", displayName: "名", emailKey: "k" }),
      "正式主题"
    );
  });

  it("空 subject 时用展示名生成【测试】前缀", () => {
    assert.equal(
      resolveTestEmailSubject({ subject: "", displayName: "MCP模板", emailKey: "mcp" }),
      "【测试】MCP模板"
    );
  });
});
