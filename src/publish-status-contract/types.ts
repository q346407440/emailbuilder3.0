/** 模板层（meta.json）与版式层（layout-manifest variants）共用的发布状态。 */
export const PUBLISH_STATUSES = ["draft", "published"] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/** 新建模板 / 新版式默认草稿，活动 V2 不可选。 */
export const DEFAULT_PUBLISH_STATUS: PublishStatus = "draft";

export function isPublishStatus(value: unknown): value is PublishStatus {
  return typeof value === "string" && (PUBLISH_STATUSES as readonly string[]).includes(value);
}

export function isPublishedPublishStatus(status: PublishStatus): boolean {
  return status === "published";
}
