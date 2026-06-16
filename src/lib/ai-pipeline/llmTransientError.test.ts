import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTransientLlmError } from "./llmTransientError";

function namedError(name: string, message = name): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

describe("isTransientLlmError", () => {
  it("AbortSignal.timeout 的 TimeoutError 视为瞬态", () => {
    assert.equal(
      isTransientLlmError(namedError("TimeoutError", "The operation was aborted due to timeout")),
      true
    );
  });

  it("AbortError 与 StepTimeoutError 视为瞬态", () => {
    assert.equal(isTransientLlmError(namedError("AbortError")), true);
    assert.equal(isTransientLlmError(namedError("StepTimeoutError")), true);
  });

  it("豆包 5xx / 429 视为瞬态，4xx 业务错误不算", () => {
    const e500 = new Error("豆包 API 500") as Error & { status?: number };
    e500.status = 500;
    const e429 = new Error("豆包 API 429") as Error & { status?: number };
    e429.status = 429;
    const e400 = new Error("豆包 API 400") as Error & { status?: number };
    e400.status = 400;
    assert.equal(isTransientLlmError(e500), true);
    assert.equal(isTransientLlmError(e429), true);
    assert.equal(isTransientLlmError(e400), false);
  });

  it("fetch 网络层失败（TypeError: fetch failed）视为瞬态", () => {
    assert.equal(isTransientLlmError(new TypeError("fetch failed")), true);
  });

  it("普通业务异常与非 Error 值不算瞬态", () => {
    assert.equal(isTransientLlmError(new Error("validate 未通过")), false);
    assert.equal(isTransientLlmError("timeout"), false);
    assert.equal(isTransientLlmError(null), false);
  });
});
