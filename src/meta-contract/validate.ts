import { validatePublishStatusField } from "../publish-status-contract/validate";
import { META_REMOVED_DELIVERY_KEYS, META_REMOVED_ROOT_KEYS } from "./removed-fields";
import { META_SCHEMA_VERSION } from "./types";

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
    }
  }

  if (root.displayName !== undefined && (typeof root.displayName !== "string" || !root.displayName.trim())) {
    issues.push({ path: "displayName", reason: "必须为非空字符串" });
  }

  const publishIssue = validatePublishStatusField(root.publishStatus, "publishStatus");
  if (publishIssue) issues.push(publishIssue);

  return issues;
}
