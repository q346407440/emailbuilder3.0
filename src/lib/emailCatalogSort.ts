import type { EmailListItem } from "../types/email";
import { compareByCreatedAtDesc, parseCreatedAtMs } from "./sortByCreatedAt";

/** 脚本批量写入 meta 时使用的占位创建时间；列表排序时优先目录 birthtime。 */
export const EMAIL_META_PLACEHOLDER_CREATED_AT = "2026-06-05T00:00:00.000Z";

/** 解析列表展示用创建时间：缺省或占位时用目录 birthtime。 */
export function resolveEmailListCreatedAt(
  metaCreatedAt: string | undefined,
  dirCreatedAtIso: string | undefined
): string | undefined {
  const dirMs = parseCreatedAtMs(dirCreatedAtIso);
  const metaMs = parseCreatedAtMs(metaCreatedAt);
  if (metaMs <= 0) return dirCreatedAtIso;
  if (metaCreatedAt === EMAIL_META_PLACEHOLDER_CREATED_AT && dirMs > metaMs) {
    return dirCreatedAtIso;
  }
  return metaCreatedAt;
}

/** 邮件模板顶栏下拉：创建时间倒序 → 更新时间倒序 → emailKey 稳定倒序。 */
export function sortEmailItemsByCreatedDesc(items: EmailListItem[]): EmailListItem[] {
  return [...items].sort((a, b) => {
    const byCreated = compareByCreatedAtDesc(a.createdAt, b.createdAt);
    if (byCreated !== 0) return byCreated;
    const byUpdated = compareByCreatedAtDesc(a.updatedAt, b.updatedAt);
    if (byUpdated !== 0) return byUpdated;
    return b.emailKey.localeCompare(a.emailKey, "zh-CN", { numeric: true, sensitivity: "base" });
  });
}
