import { AI_PIPELINE_PLACEHOLDER_IMAGE_URL } from "./constants";
import { appendPipelineLog } from "./llmExchangeFileLog";
import type { ImageResolved } from "./types";

export type PexelsSlotResolveMeta = ImageResolved & {
  pexelsOk: boolean;
  failReason?: string;
  failDetail?: string;
  imageQuery: string;
};

/** B4：写入搜图结果摘要（便于排查 Pexels / manifest 问题）。 */
export function logB4PexelsSummary(resolved: PexelsSlotResolveMeta[]): void {
  if (resolved.length === 0) return;

  const okCount = resolved.filter((item) => item.pexelsOk).length;
  appendPipelineLog({
    stage: "B4",
    message: `Pexels 搜图完成：${okCount}/${resolved.length} 成功`,
    detail: {
      okCount,
      total: resolved.length,
      slots: resolved.map((item) => ({
        slotId: item.slotId,
        ok: item.pexelsOk,
        reason: item.pexelsOk ? undefined : item.failReason,
        photoId: item.url.match(/photos\/(\d+)/)?.[1],
      })),
    },
  });
}

/** B4：全部 slot 回落占位图时写入管线 JSONL 日志。 */
export function logB4PexelsAllFailedIfNeeded(resolved: PexelsSlotResolveMeta[]): void {
  if (resolved.length === 0) return;

  const failures = resolved.filter((item) => !item.pexelsOk);
  if (failures.length === 0) return;
  if (failures.length !== resolved.length) return;

  const allMissingKey = failures.every((item) => item.failReason === "PEXELS_API_KEY_MISSING");

  appendPipelineLog({
    stage: "B4",
    message: allMissingKey
      ? "Pexels 搜图全部失败：API 进程未读取 PEXELS_API_KEY（请确认 .env 且重启 API）"
      : "Pexels 搜图全部失败，已回落占位图",
    detail: {
      slotCount: resolved.length,
      placeholderUrl: AI_PIPELINE_PLACEHOLDER_IMAGE_URL,
      hint: allMissingKey
        ? "server/index.ts 会在启动时加载项目根 .env；若仍失败，请 ./start.sh 重启或检查 .env 中 PEXELS_API_KEY"
        : undefined,
      slots: failures.map((item) => ({
        slotId: item.slotId,
        regionId: item.regionId,
        imageQuery: item.imageQuery,
        reason: item.failReason ?? "PEXELS_NO_RESULT",
        detail: item.failDetail,
      })),
    },
  });
}
