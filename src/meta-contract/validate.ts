import { validatePublishStatusField } from "../publish-status-contract/validate";
import {
  META_DELIVERY_PREHEADER_MAX_LENGTH,
  META_DELIVERY_SUBJECT_MAX_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  META_DISPLAY_NAME_MAX_LENGTH,
} from "./field-limits";
import { META_REMOVED_DELIVERY_KEYS, META_REMOVED_ROOT_KEYS } from "./removed-fields";
import { META_SCHEMA_VERSION } from "./types";

function validateOptionalStringMaxLength(
  issues: MetaValidationIssue[],
  path: string,
  value: unknown,
  maxLength: number
): void {
  if (value === undefined) return;
  if (typeof value !== "string") {
    issues.push({ path, reason: "必须为字符串" });
    return;
  }
  if (value.length > maxLength) {
    issues.push({ path, reason: `长度不能超过 ${maxLength} 个字符` });
  }
}

export type MetaValidationIssue = {
  path: string;
  reason: string;
};

/** 校验 meta.json 是否仍含已下线字段（用于 validate:all）。 */
export function validateEmailMeta(meta: unknown): MetaValidationIssue[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return [{ path: "meta", reason: "必须为对象" }];
  }
  const root = meta as Record<string, unknown>;
  const issues: MetaValidationIssue[] = [];

  if (root.schemaVersion !== META_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      reason: `meta.schemaVersion 必须为 ${META_SCHEMA_VERSION}`,
    });
  }

  for (const key of META_REMOVED_ROOT_KEYS) {
    if (key in root) {
      issues.push({ path: key, reason: "已下线字段，请从 meta.json 移除" });
    }
  }

  const delivery = root.delivery;
  if (delivery !== undefined) {
    if (!delivery || typeof delivery !== "object" || Array.isArray(delivery)) {
      issues.push({ path: "delivery", reason: "必须为对象" });
    } else {
      for (const key of META_REMOVED_DELIVERY_KEYS) {
        if (key in (delivery as Record<string, unknown>)) {
          issues.push({ path: `delivery.${key}`, reason: "已下线字段，请从 meta.json 移除" });
        }
      }
      const deliveryRecord = delivery as Record<string, unknown>;
      validateOptionalStringMaxLength(
        issues,
        "delivery.subject",
        deliveryRecord.subject,
        META_DELIVERY_SUBJECT_MAX_LENGTH
      );
      validateOptionalStringMaxLength(
        issues,
        "delivery.preheader",
        deliveryRecord.preheader,
        META_DELIVERY_PREHEADER_MAX_LENGTH
      );
    }
  }

  if (root.displayName !== undefined) {
    if (typeof root.displayName !== "string" || !root.displayName.trim()) {
      issues.push({ path: "displayName", reason: "必须为非空字符串" });
    } else if (root.displayName.length > META_DISPLAY_NAME_MAX_LENGTH) {
      issues.push({
        path: "displayName",
        reason: `长度不能超过 ${META_DISPLAY_NAME_MAX_LENGTH} 个字符`,
      });
    }
  }

  validateOptionalStringMaxLength(issues, "description", root.description, META_DESCRIPTION_MAX_LENGTH);

  const publishIssue = validatePublishStatusField(root.publishStatus, "publishStatus");
  if (publishIssue) issues.push(publishIssue);

  return issues;
}
