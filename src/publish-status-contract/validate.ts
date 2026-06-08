import { PUBLISH_STATUSES, isPublishStatus } from "./types";

export type PublishStatusValidationIssue = {
  path: string;
  reason: string;
};

/** 校验单个 publishStatus 字段（落盘 / API 请求体）。 */
export function validatePublishStatusField(
  value: unknown,
  path = "publishStatus"
): PublishStatusValidationIssue | null {
  if (value === undefined) {
    return { path, reason: "publishStatus 为必填" };
  }
  if (!isPublishStatus(value)) {
    return { path, reason: `publishStatus 须为 ${PUBLISH_STATUSES.join(" | ")}` };
  }
  return null;
}
