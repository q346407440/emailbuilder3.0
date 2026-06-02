import { isCollectionField } from "../../payload-contract/collection-item-fields";
import { toCollectionItems } from "../../lib/payloadSlotDraft";
import type { CollectionPreviewField } from "./types";

export const COLLECTION_PREVIEW_MAX_VISIBLE_TABS = 4;

export function displayPreviewScalar(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function rowHasPreviewFieldData(
  row: Record<string, unknown>,
  fields: CollectionPreviewField[]
): boolean {
  return fields.some((field) => {
    const value = row[field.key];
    if (isCollectionField(field)) {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

export function normalizeCollectionPreviewRows(
  values: unknown,
  tabCount: number | undefined,
  padToTabCount: boolean
): Record<string, unknown>[] {
  const parsed = toCollectionItems(values).map((row) => ({ ...row }));
  if (tabCount == null) {
    return parsed;
  }
  const rows = parsed.slice(0, tabCount);
  if (!padToTabCount) {
    return rows;
  }
  while (rows.length < tabCount) {
    rows.push({});
  }
  return rows;
}

/** 可见标签窗口：总数 ≤4 时全展示；否则固定 4 格并随当前项滑动 */
export function resolveCollectionPreviewTabIndices(
  total: number,
  activeIndex: number,
  maxVisible = COLLECTION_PREVIEW_MAX_VISIBLE_TABS
): number[] {
  if (total <= 0) return [];
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, index) => index);
  }
  const start = Math.min(Math.max(0, activeIndex - 1), total - maxVisible);
  return Array.from({ length: maxVisible }, (_, offset) => start + offset);
}

export function nestedCollectionSummary(value: unknown): string {
  const count = Array.isArray(value) ? value.length : 0;
  if (count === 0) return "暂无规格";
  return `${count} 条规格`;
}
