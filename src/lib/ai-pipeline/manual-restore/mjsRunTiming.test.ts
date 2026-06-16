import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMjsRunTiming, MANUAL_RESTORE_MJS_STRATEGY } from "./mjsRunTiming";

describe("createMjsRunTiming", () => {
  it("写入 00-run-meta.json 与 00-run-timing.txt", () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjs-timing-"));
    const timing = createMjsRunTiming(logDir, {
      emailKey: "demo",
      layoutVariantId: "test-layout",
    });

    const t0 = performance.now();
    while (performance.now() - t0 < 2) {
      /* 至少耗一点 time */
    }
    timing.record("MR:AssetSlots 完成", t0, { stepId: "MR:AssetSlots" });

    const runStart = performance.now();
    timing.finish({ ok: true, startMs: runStart });

    const meta = JSON.parse(fs.readFileSync(path.join(logDir, "00-run-meta.json"), "utf8")) as {
      strategy: string;
      steps: { label: string; durationMs: number }[];
      totalDurationMs?: number;
      ok?: boolean;
    };
    assert.equal(meta.strategy, MANUAL_RESTORE_MJS_STRATEGY);
    assert.equal(meta.steps.length, 1);
    assert.ok(meta.steps[0]!.durationMs >= 0);
    assert.equal(meta.ok, true);
    assert.ok(typeof meta.totalDurationMs === "number");

    const txt = fs.readFileSync(path.join(logDir, "00-run-timing.txt"), "utf8");
    assert.ok(txt.includes(`strategy: ${MANUAL_RESTORE_MJS_STRATEGY}`));
    assert.ok(txt.includes("MR:AssetSlots 完成"));
  });
});
