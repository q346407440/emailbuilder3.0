type InterpolationSlotLike = {
  slotId: string;
  defaultValue?: string;
};

const INTERPOLATION_TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractInterpolationSlotIds(source: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const match of source.matchAll(INTERPOLATION_TOKEN_RE)) {
    const id = match[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function interpolateTextValue(
  source: string,
  slots: readonly InterpolationSlotLike[] | undefined,
  values: Record<string, unknown>
): string {
  const byId = new Map((slots ?? []).map((slot) => [slot.slotId, slot]));
  return source.replace(INTERPOLATION_TOKEN_RE, (token, slotId: string) => {
    const rawValue = values[slotId];
    if (typeof rawValue === "string") return rawValue;
    const fallback = byId.get(slotId)?.defaultValue;
    return typeof fallback === "string" ? fallback : token;
  });
}
