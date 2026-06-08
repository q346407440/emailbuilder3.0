/** 逻辑删除：落盘字段 `deletedAt`（ISO 时间）；删除该字段即可在编辑器中恢复展示。 */

export type LogicallyDeletable = {
  deletedAt?: string | null;
};

export function isLogicallyDeleted(entity: LogicallyDeletable | null | undefined): boolean {
  return typeof entity?.deletedAt === "string" && entity.deletedAt.trim().length > 0;
}

export function logicalDeleteTimestamp(): string {
  return new Date().toISOString();
}

export function validateOptionalDeletedAtField(
  value: unknown,
  path: string
): { path: string; reason: string } | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    return { path, reason: "deletedAt 若存在须为非空 ISO 时间字符串；恢复展示请删除该字段" };
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    return { path, reason: "deletedAt 须为可解析的 ISO 时间" };
  }
  return null;
}
