import { performance } from "node:perf_hooks";

/** 记录步骤开始时间（performance.now()）。 */
export function stepStart(): number {
  return performance.now();
}

/** 距 startMs 经过的秒数，保留 1 位小数，如 `12.3s`。 */
export function stepElapsedSec(startMs: number): string {
  return `${((performance.now() - startMs) / 1000).toFixed(1)}s`;
}

/** 步骤完成日志：`[tag] label（12.3s）detail` */
export function logStepDone(tag: string, label: string, startMs: number, detail?: string): void {
  const suffix = detail ? ` ${detail}` : "";
  console.log(`${tag} ${label}（${stepElapsedSec(startMs)}）${suffix}`);
}
