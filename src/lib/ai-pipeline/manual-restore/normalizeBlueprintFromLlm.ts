/** 将豆包蓝图 JSON 规整为 ManualRestoreBlueprintSchema 可接受形态。 */
export function normalizeBlueprintFromLlm(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };

  if (o.spacing && typeof o.spacing === "object") {
    o.spacing = normalizeSpacingMap(o.spacing as Record<string, unknown>);
  }
  if (o.typography && typeof o.typography === "object") {
    o.typography = normalizeTypographyMap(o.typography as Record<string, unknown>);
  }
  if (Array.isArray(o.imageSlots)) {
    o.imageSlots = o.imageSlots.map((slot) => {
      if (!slot || typeof slot !== "object") return slot;
      const s = { ...(slot as Record<string, unknown>) };
      if (s.height != null) s.height = toPxString(s.height);
      if (s.targetWidth != null && typeof s.targetWidth === "string") {
        const n = Number.parseInt(s.targetWidth, 10);
        if (!Number.isNaN(n)) s.targetWidth = n;
      }
      return s;
    });
  }
  if (Array.isArray(o.sections)) {
    o.sections = o.sections.map((sec) => {
      if (!sec || typeof sec !== "object") return sec;
      const s = { ...(sec as Record<string, unknown>) };
      for (const key of ["padTop", "padBottom"] as const) {
        if (s[key] != null) s[key] = toPxString(s[key]);
      }
      return s;
    });
  }

  return o;
}

function toPxString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (/^\d+(\.\d+)?$/.test(t)) return `${t}px`;
    return t;
  }
  return String(value);
}

function normalizeSpacingMap(spacing: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(spacing)) {
    let px = toPxString(v);
    if (k === "section" || k === "pageInline") {
      const m = /^(\d+(?:\.\d+)?)px$/.exec(px);
      if (m && Number(m[1]) > 24) px = "24px";
    }
    out[k] = px;
  }
  return out;
}

function normalizeTypographyMap(typography: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(typography)) {
    if (typeof v === "string") {
      out[k] = /^\d+(\.\d+)?$/.test(v.trim()) ? `${v.trim()}px` : v;
      continue;
    }
    if (v && typeof v === "object" && "fontSize" in v) {
      out[k] = toPxString((v as { fontSize?: unknown }).fontSize);
      continue;
    }
    if (typeof v === "number") {
      out[k] = `${v}px`;
      continue;
    }
    out[k] = "14px";
  }
  return out;
}
