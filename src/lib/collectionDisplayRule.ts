import type { CollectionDisplayRule } from "../payload-contract/types";

function normalizeRuleValues(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = String(raw ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function normalizeCollectionDisplayRule(
  rule: CollectionDisplayRule | undefined
): CollectionDisplayRule | undefined {
  if (!rule || typeof rule !== "object") return undefined;
  const keyField = typeof rule.keyField === "string" ? rule.keyField.trim() : "";
  const includeValues = normalizeRuleValues(rule.includeValues);
  const excludeValues = normalizeRuleValues(rule.excludeValues);
  if (!keyField && includeValues.length === 0 && excludeValues.length === 0) {
    return undefined;
  }

  return {
    ...(keyField ? { keyField } : {}),
    ...(includeValues.length > 0 ? { includeValues } : {}),
    ...(excludeValues.length > 0 ? { excludeValues } : {}),
  };
}

export function applyCollectionDisplayRule(
  items: Record<string, unknown>[],
  rule: CollectionDisplayRule | undefined
): Record<string, unknown>[] {
  const normalized = normalizeCollectionDisplayRule(rule);
  if (!normalized) return items;
  const keyField = normalized.keyField || "type";
  const include = new Set(normalized.includeValues ?? []);
  const exclude = new Set(normalized.excludeValues ?? []);
  const filtered = items.filter((item) => {
    const raw = item[keyField];
    const key = String(raw ?? "").trim();
    if (include.size > 0 && !include.has(key)) return false;
    if (exclude.size > 0 && exclude.has(key)) return false;
    return true;
  });
  return filtered;
}
