import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { callLlmStageWithRetry } from "./callLlmStageWithRetry";
import {
  appendRetryToUserText,
  buildRetryUserAppendix,
  feedbackFromLlmAttempt,
  LLM_RETRY_OUTPUT_MAX_CHARS,
  LlmStageFailure,
  truncateRetryOutput,
} from "./llmRetryFeedback";
import { AiPipelineError } from "../../layout-variant-ai-contract/errors";

describe("llmRetryFeedback", () => {
  it("buildRetryUserAppendix 包含上一轮输出与错误", () => {
    const appendix = buildRetryUserAppendix({
      previousOutput: '{"root":{"kind":"layout.container"}}',
      errors: ["无法解析为 compact 树", "kind 不在白名单"],
    });
    assert.match(appendix, /上一轮输出/);
    assert.match(appendix, /layout\.container/);
    assert.match(appendix, /1\. 无法解析为 compact 树/);
    assert.match(appendix, /2\. kind 不在白名单/);
  });

  it("appendRetryToUserText 无 feedback 时原样返回", () => {
    assert.equal(appendRetryToUserText("请生成 JSON", undefined), "请生成 JSON");
  });

  it("truncateRetryOutput 超长截断", () => {
    const long = "x".repeat(LLM_RETRY_OUTPUT_MAX_CHARS + 100);
    const out = truncateRetryOutput(long);
    assert.ok(out.length < long.length);
    assert.match(out, /已截断/);
  });

  it("feedbackFromLlmAttempt parse 失败时用原文", () => {
    const fb = feedbackFromLlmAttempt("not json", null, "无法解析");
    assert.equal(fb.previousOutput, "not json");
    assert.deepEqual(fb.errors, ["无法解析"]);
  });

  it("feedbackFromLlmAttempt normalize 失败时用 parsed JSON", () => {
    const fb = feedbackFromLlmAttempt('{"bad":true}', { bad: true }, "字段不合法");
    assert.match(fb.previousOutput, /"bad"/);
  });
});

describe("callLlmStageWithRetry feedback", () => {
  it("校验失败重试时第二次带上 feedback", async () => {
    const seen: Array<{ attempt: number; userText?: string }> = [];

    const result = await callLlmStageWithRetry({ stage: "C", sectionId: "s1" }, async ({ attempt, feedback }) => {
      seen.push({
        attempt,
        userText: feedback ? appendRetryToUserText("base", feedback) : "base",
      });
      if (attempt === 1) {
        throw new LlmStageFailure(
          feedbackFromLlmAttempt("{ invalid", null, "无法解析为 JSON")
        );
      }
      return { ok: true };
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(seen.length, 2);
    assert.equal(seen[0]!.attempt, 1);
    assert.equal(seen[0]!.userText, "base");
    assert.equal(seen[1]!.attempt, 2);
    assert.match(seen[1]!.userText!, /上一轮输出/);
    assert.match(seen[1]!.userText!, /无法解析为 JSON/);
  });

  it("两次均失败时抛出 VALIDATION_FAILED", async () => {
    await assert.rejects(
      () =>
        callLlmStageWithRetry({ stage: "C" }, async () => {
          throw new LlmStageFailure(
            feedbackFromLlmAttempt("{}", {}, "区域结构为空")
          );
        }),
      (e: unknown) => e instanceof AiPipelineError && e.code === "VALIDATION_FAILED"
    );
  });

  it("429 瞬态错误退避重试后成功", async () => {
    let calls = 0;
    const err429 = new Error("豆包 API 429") as Error & { status?: number };
    err429.status = 429;

    const result = await callLlmStageWithRetry(
      { stage: "RA", maxRetries: 0, maxTransientRetries: 2 },
      async () => {
        calls += 1;
        if (calls === 1) throw err429;
        return { ok: true };
      }
    );

    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 2);
  });
});
