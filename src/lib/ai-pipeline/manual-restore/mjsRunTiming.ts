import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { MjsGenerateMode } from "../../../layout-variant-ai-contract/mjsGenerateMode";
import { stepElapsedSec } from "./stepTiming";

export type MjsRunTimingStep = {
  /** 步骤完成时刻（ISO） */
  at: string;
  label: string;
  durationMs: number;
  durationSec: string;
  detail?: string;
  /** 对应 SSE 步骤 id（若有） */
  stepId?: string;
  attempt?: number;
};

export type MjsRunMetaFile = {
  mjsGenerateMode: MjsGenerateMode;
  emailKey: string;
  layoutVariantId: string | null;
  startedAt: string;
  finishedAt?: string;
  ok?: boolean;
  totalDurationMs?: number;
  totalDurationSec?: string;
  error?: string;
  steps: MjsRunTimingStep[];
};

export type MjsRunTimingRecordOpts = {
  detail?: string;
  stepId?: string;
  attempt?: number;
};

/** 写入 logs/manual-restore-mjs-<id>/00-run-meta.json，供两种生成模式对比耗时。 */
export function createMjsRunTiming(
  logDir: string,
  meta: Pick<MjsRunMetaFile, "mjsGenerateMode" | "emailKey" | "layoutVariantId">
): {
  record: (label: string, startMs: number, opts?: MjsRunTimingRecordOpts) => MjsRunTimingStep;
  finish: (opts: { ok: boolean; startMs: number; error?: string }) => MjsRunMetaFile;
  read: () => MjsRunMetaFile;
} {
  const startedAt = new Date().toISOString();
  const filePath = path.join(logDir, "00-run-meta.json");

  const state: MjsRunMetaFile = {
    ...meta,
    startedAt,
    steps: [],
  };

  const flush = () => {
    fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
  };

  flush();

  return {
    record(label, startMs, opts) {
      const durationMs = Math.round(performance.now() - startMs);
      const entry: MjsRunTimingStep = {
        at: new Date().toISOString(),
        label,
        durationMs,
        durationSec: stepElapsedSec(startMs),
        ...(opts?.detail ? { detail: opts.detail } : {}),
        ...(opts?.stepId ? { stepId: opts.stepId } : {}),
        ...(opts?.attempt !== undefined ? { attempt: opts.attempt } : {}),
      };
      state.steps.push(entry);
      flush();
      return entry;
    },
    finish({ ok, startMs, error }) {
      state.finishedAt = new Date().toISOString();
      state.ok = ok;
      state.totalDurationMs = Math.round(performance.now() - startMs);
      state.totalDurationSec = stepElapsedSec(startMs);
      if (error) state.error = error;
      flush();
      writeTimingSummaryTxt(logDir, state);
      return { ...state };
    },
    read: () => ({ ...state, steps: [...state.steps] }),
  };
}

/** 便于终端/对比阅读的纯文本摘要。 */
function writeTimingSummaryTxt(logDir: string, meta: MjsRunMetaFile): void {
  const lines = [
    `# manual-restore mjs 用时摘要`,
    `mode: ${meta.mjsGenerateMode}`,
    `emailKey: ${meta.emailKey}`,
    `layoutVariantId: ${meta.layoutVariantId ?? "(none)"}`,
    `started: ${meta.startedAt}`,
    `finished: ${meta.finishedAt ?? ""}`,
    `ok: ${meta.ok === undefined ? "?" : meta.ok}`,
    `total: ${meta.totalDurationSec ?? "?"} (${meta.totalDurationMs ?? "?"} ms)`,
    meta.error ? `error: ${meta.error}` : "",
    "",
    "## steps",
    ...meta.steps.map((s) => {
      const parts = [
        s.stepId ? `[${s.stepId}]` : null,
        s.attempt !== undefined ? `(attempt ${s.attempt})` : null,
        s.label,
        s.durationSec,
      ].filter(Boolean);
      const tail = s.detail ? ` — ${s.detail}` : "";
      return `- ${parts.join(" ")}${tail}`;
    }),
  ].filter((line) => line !== undefined);
  fs.writeFileSync(path.join(logDir, "00-run-timing.txt"), `${lines.join("\n")}\n`);
}
