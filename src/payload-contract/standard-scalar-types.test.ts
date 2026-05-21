import assert from "node:assert";
import { describe, it } from "node:test";
import { coerceScalarPayloadValue, parseScalarInitialValue } from "./standard-scalar-types";

describe("standard-scalar-types", () => {
  it("parseScalarInitialValue 按类型解析初值", () => {
    assert.equal(parseScalarInitialValue("42", "number"), 42);
    assert.equal(parseScalarInitialValue("", "string"), undefined);
    assert.equal(parseScalarInitialValue("https://a.com", "url"), "https://a.com");
  });

  it("coerceScalarPayloadValue 文本转数值", () => {
    assert.equal(coerceScalarPayloadValue("12.5", "number"), 12.5);
    assert.equal(coerceScalarPayloadValue("abc", "number"), undefined);
  });
});
