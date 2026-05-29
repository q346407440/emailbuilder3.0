import { META_REMOVED_DELIVERY_KEYS, META_REMOVED_ROOT_KEYS } from "./removed-fields";

/** 落盘 / 读取后规范化：剥离已下线 meta 字段，避免多 schema 并存。 */
export function normalizePersistedEmailMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...meta };
  for (const key of META_REMOVED_ROOT_KEYS) {
    delete next[key];
  }
  if (next.delivery && typeof next.delivery === "object" && !Array.isArray(next.delivery)) {
    const delivery = { ...(next.delivery as Record<string, unknown>) };
    for (const key of META_REMOVED_DELIVERY_KEYS) {
      delete delivery[key];
    }
    next.delivery = delivery;
  }
  return next;
}

/** @deprecated 使用 normalizePersistedEmailMeta */
export const stripDeprecatedMetaFields = normalizePersistedEmailMeta;
