import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { logB4PexelsAllFailedIfNeeded } from "./logB4PexelsFailures";
import { llmExchangeContextStore } from "./llmCallContext";

describe("logB4PexelsAllFailedIfNeeded", () => {
  it("全部失败时写入 pipeline 日志", () => {
    const dir = mkdtempSync(join(tmpdir(), "ai-pipeline-log-"));
    const logPath = join(dir, "test.jsonl");
    const prev = process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH;
    process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH = logPath;
    process.env.AI_PIPELINE_LLM_EXCHANGE_LOG = "1";

    try {
      llmExchangeContextStore.run(
        { pipelineRunId: "run-1", emailKey: "e1", layoutVariantId: "v1" },
        () => {
          logB4PexelsAllFailedIfNeeded([
            {
              slotId: "s1-img-0",
              regionId: "s1",
              url: "https://example.com/placeholder.jpg",
              alt: "logo",
              pexelsOk: false,
              failReason: "PEXELS_API_KEY_MISSING",
              imageQuery: "brand logo",
            },
          ]);
        }
      );

      const lines = readFileSync(logPath, "utf8").trim().split("\n");
      assert.equal(lines.length, 1);
      const entry = JSON.parse(lines[0]!);
      assert.equal(entry.type, "pipeline");
      assert.equal(entry.stage, "B4");
      assert.match(entry.message, /PEXELS_API_KEY/);
    } finally {
      if (prev === undefined) delete process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH;
      else process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH = prev;
    }
  });

  it("部分成功时不写全失败日志", () => {
    const dir = mkdtempSync(join(tmpdir(), "ai-pipeline-log-"));
    const logPath = join(dir, "test-partial.jsonl");
    const prev = process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH;
    process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH = logPath;

    try {
      logB4PexelsAllFailedIfNeeded([
        {
          slotId: "s1-img-0",
          regionId: "s1",
          url: "https://example.com/a.jpg",
          pexelsOk: true,
          imageQuery: "a",
        },
        {
          slotId: "s1-img-1",
          regionId: "s1",
          url: "https://example.com/placeholder.jpg",
          pexelsOk: false,
          failReason: "PEXELS_NO_RESULT",
          imageQuery: "b",
        },
      ]);
      assert.throws(() => readFileSync(logPath, "utf8"));
    } finally {
      if (prev === undefined) delete process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH;
      else process.env.AI_PIPELINE_LLM_EXCHANGE_LOG_PATH = prev;
    }
  });
});
