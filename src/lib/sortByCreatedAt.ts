/** 将 ISO 时间串解析为毫秒；无效则 0。 */
export function parseCreatedAtMs(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

/** 创建时间倒序；无创建时间视为 0（排在后面）。 */
export function compareByCreatedAtDesc(
  aCreatedAt: string | undefined,
  bCreatedAt: string | undefined,
  tieBreak: () => number = () => 0
): number {
  const delta = parseCreatedAtMs(bCreatedAt) - parseCreatedAtMs(aCreatedAt);
  if (delta !== 0) return delta;
  return tieBreak();
}
