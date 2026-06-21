import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { stepElapsedSec } from "../stepTiming";

export const RESTORE_AST_PIPELINE_STRATEGY = "restore-ast" as const;

export type RestoreAstRunTimingStep = {
  at: string;
  label: string;
  durationMs: number;
  durationSec: string;
  detail?: string;
  stepId?: string;
};

export type RestoreAstRunMetaFile = {
  strategy: typeof RESTORE_AST_PIPELINE_STRATEGY;
  emailKey: string;
  layoutVariantId: string;
  startedAt: string;
  finishedAt?: string;
  ok?: boolean;
  totalDurationMs?: number;
  totalDurationSec?: string;
  error?: string;
  logDir: string;
  steps: RestoreAstRunTimingStep[];
};

export type RestoreAstRunTimingRecordOpts = {
  detail?: string;
  stepId?: string;
};

/** 写入 logs/restore-ast-<id>/00-run-meta.json */
export function createRestoreAstRunLog(
  logDir: string,
  meta: Pick<RestoreAstRunMetaFile, "emailKey" | "layoutVariantId">
): {
  record: (label: string, startMs: number, opts?: RestoreAstRunTimingRecordOpts) => RestoreAstRunTimingStep;
  finish: (opts: { ok: boolean; startMs: number; error?: string }) => RestoreAstRunMetaFile;
  logPath: (filename: string) => string;
} {
  const startedAt = new Date().toISOString();
  const filePath = path.join(logDir, "00-run-meta.json");

  const state: RestoreAstRunMetaFile = {
    ...meta,
    strategy: RESTORE_AST_PIPELINE_STRATEGY,
    startedAt,
    logDir,
    steps: [],
  };

  const flush = () => {
    fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
  };

  fs.mkdirSync(logDir, { recursive: true });
  flush();

  return {
    logPath: (filename) => path.join(logDir, filename),
    record(label, startMs, opts) {
      const durationMs = Math.round(performance.now() - startMs);
      const entry: RestoreAstRunTimingStep = {
        at: new Date().toISOString(),
        label,
        durationMs,
        durationSec: stepElapsedSec(startMs),
        ...(opts?.detail ? { detail: opts.detail } : {}),
        ...(opts?.stepId ? { stepId: opts.stepId } : {}),
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
      return { ...state, steps: [...state.steps] };
    },
  };
}

function writeTimingSummaryTxt(logDir: string, meta: RestoreAstRunMetaFile): void {
  const lines = [
    "# restore-ast 用时摘要",
    `strategy: ${meta.strategy}`,
    `emailKey: ${meta.emailKey}`,
    `layoutVariantId: ${meta.layoutVariantId}`,
    `ok: ${meta.ok ?? false}`,
    `total: ${meta.totalDurationSec ?? "?"} (${meta.totalDurationMs ?? "?"} ms)`,
    "",
    "## steps",
    ...meta.steps.map(
      (s) =>
        `- ${s.label} (${s.durationSec})${s.stepId ? ` [${s.stepId}]` : ""}${s.detail ? ` — ${s.detail}` : ""}`
    ),
  ];
  if (meta.error) {
    lines.push("", `error: ${meta.error}`);
  }
  fs.writeFileSync(path.join(logDir, "00-timing-summary.txt"), `${lines.join("\n")}\n`);
}
