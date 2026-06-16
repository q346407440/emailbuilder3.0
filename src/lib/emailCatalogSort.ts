import { compareByCreatedAtDesc, parseCreatedAtMs } from "./sortByCreatedAt";

type EmailCatalogSortableItem = {
  emailKey: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmailCatalogDesignSortable = {
  designId: string;
  createdAt?: string;
};

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

/** 邮件模板列表：创建时间倒序 → emailKey 稳定倒序。 */
export function sortEmailItemsByCreatedDesc<T extends EmailCatalogSortableItem>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    compareByCreatedAtDesc(a.createdAt, b.createdAt, () =>
      b.emailKey.localeCompare(a.emailKey, "zh-CN", { numeric: true, sensitivity: "base" })
    )
  );
}

/** 版式列表：创建时间倒序 → designId 稳定倒序。 */
export function compareEmailCatalogDesignByCreatedDesc(
  a: EmailCatalogDesignSortable,
  b: EmailCatalogDesignSortable
): number {
  return compareByCreatedAtDesc(a.createdAt, b.createdAt, () =>
    b.designId.localeCompare(a.designId, "zh-CN", { numeric: true, sensitivity: "base" })
  );
}

export function sortEmailCatalogDesignsByCreatedDesc<T extends EmailCatalogDesignSortable>(
  designs: T[]
): T[] {
  return [...designs].sort(compareEmailCatalogDesignByCreatedDesc);
}

/** @deprecated 列表排序已改为创建时间倒序，请使用 sortEmailItemsByCreatedDesc。 */
export const sortEmailItemsByUpdatedDesc = sortEmailItemsByCreatedDesc;
