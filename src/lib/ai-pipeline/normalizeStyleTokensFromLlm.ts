import {
  AI_PIPELINE_B1_FALLBACK_TOKENS,
  B1_RADIUS_TIER_ENUMS,
  B1_SPACING_TIER_ENUMS,
  B1_TYPOGRAPHY_TIER_ENUMS,
} from "./b1StyleTierPresets";
import type { StyleTokensPayloadParsed } from "./schemas/b1-style-tokens";
import { HEX_COLOR_RE } from "./schemas/shared";

const SPACING_PRESET_MAP = {
  compact: { section: "12px", gap: "8px", pageInline: "16px" },
  standard: { section: "16px", gap: "12px", pageInline: "20px" },
  spacious: { section: "20px", gap: "16px", pageInline: "24px" },
  generous: { section: "24px", gap: "20px", pageInline: "24px" },
} as const;

const TYPOGRAPHY_PRESET_MAP = {
  compact: { display: "28px", h1: "22px", body: "14px", caption: "12px" },
  standard: { display: "32px", h1: "24px", body: "16px", caption: "12px" },
  large: { display: "36px", h1: "26px", body: "16px", caption: "14px" },
} as const;

const RADIUS_PRESET_MAP = {
  sharp: { panel: "0", cta: "0" },
  standard: { panel: "12px", cta: "8px" },
  rounded: { panel: "16px", cta: "24px" },
  pill: { panel: "12px", cta: "9999px" },
} as const;


/** 将 LLM 输出的 preset + hex JSON 规范化为管线内部 StyleTokensPayload。 */
export function normalizeStyleTokensFromLlm(parsed: unknown): StyleTokensPayloadParsed | null {
  if (!parsed || typeof parsed !== "object") return null;
  const raw = parsed as Record<string, unknown>;

  if (raw.tokens && typeof raw.tokens === "object" && raw.canvas && typeof raw.canvas === "object") {
    return coerceNestedTokensPayload(raw);
  }

  const colors = readColors(raw.colors ?? raw.colorOverrides);
  if (!colors) return null;

  const spacingPreset = pickPreset(raw.spacingPreset, SPACING_PRESET_MAP, "standard");
  const typographyPreset = pickPreset(raw.typographyPreset, TYPOGRAPHY_PRESET_MAP, "standard");
  const radiusPreset = pickPreset(raw.radiusPreset, RADIUS_PRESET_MAP, "standard");

  const emailBackground = normalizeHex(raw.emailBackground ?? raw.canvasBg) ?? "#FFFFFF";
  const contentSurface = normalizeHex(raw.contentSurface ?? raw.contentBg) ?? "#FFFFFF";

  return {
    tokens: {
      colors,
      spacing: { ...SPACING_PRESET_MAP[spacingPreset] },
      typography: { ...TYPOGRAPHY_PRESET_MAP[typographyPreset] },
      radius: { ...RADIUS_PRESET_MAP[radiusPreset] },
    },
    canvas: {
      width: "600px",
      emailBackground,
      contentSurface,
    },
  };
}

function coerceNestedTokensPayload(raw: Record<string, unknown>): StyleTokensPayloadParsed | null {
  const tokens = raw.tokens as Record<string, unknown>;
  const canvas = raw.canvas as Record<string, unknown>;
  const colors = readColors(tokens.colors);
  if (!colors) return null;

  return {
    tokens: {
      colors,
      spacing: readSpacing(tokens.spacing),
      typography: readTypography(tokens.typography),
      radius: readRadius(tokens.radius),
    },
    canvas: {
      width: typeof canvas.width === "string" ? canvas.width : "600px",
      emailBackground: normalizeHex(canvas.emailBackground) ?? "#FFFFFF",
      contentSurface: normalizeHex(canvas.contentSurface) ?? "#FFFFFF",
    },
  };
}

function readColors(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const c = value as Record<string, unknown>;
  const primary = normalizeHex(c.primary);
  const secondary = normalizeHex(c.secondary);
  const surface = normalizeHex(c.surface);
  if (!primary || !secondary || !surface) return null;
  return { primary, secondary, surface };
}

function readSpacing(value: unknown) {
  const fallback = SPACING_PRESET_MAP.standard;
  if (!value || typeof value !== "object") return { ...fallback };
  const s = value as Record<string, unknown>;
  return {
    section: pickEnum(String(s.section ?? ""), B1_SPACING_TIER_ENUMS.section, fallback.section),
    gap: pickEnum(String(s.gap ?? ""), B1_SPACING_TIER_ENUMS.gap, fallback.gap),
    pageInline: pickEnum(String(s.pageInline ?? ""), B1_SPACING_TIER_ENUMS.pageInline, fallback.pageInline),
  };
}

function readTypography(value: unknown) {
  const fallback = TYPOGRAPHY_PRESET_MAP.standard;
  if (!value || typeof value !== "object") return { ...fallback };
  const t = value as Record<string, unknown>;
  return {
    display: pickEnum(String(t.display ?? ""), B1_TYPOGRAPHY_TIER_ENUMS.display, fallback.display),
    h1: pickEnum(String(t.h1 ?? ""), B1_TYPOGRAPHY_TIER_ENUMS.h1, fallback.h1),
    body: pickEnum(String(t.body ?? ""), B1_TYPOGRAPHY_TIER_ENUMS.body, fallback.body),
    caption: pickEnum(String(t.caption ?? ""), B1_TYPOGRAPHY_TIER_ENUMS.caption, fallback.caption),
  };
}

function readRadius(value: unknown) {
  const fallback = RADIUS_PRESET_MAP.standard;
  if (!value || typeof value !== "object") return { ...fallback };
  const r = value as Record<string, unknown>;
  return {
    panel: pickEnum(String(r.panel ?? ""), B1_RADIUS_TIER_ENUMS.panel, fallback.panel),
    cta: pickEnum(String(r.cta ?? ""), B1_RADIUS_TIER_ENUMS.cta, fallback.cta),
  };
}

function pickPreset<T extends string>(
  value: unknown,
  map: Record<T, unknown>,
  fallback: T
): T {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (key && key in map) return key as T;
  return fallback;
}

function pickEnum<T extends string>(value: string, enums: readonly T[], fallback: T): T {
  return (enums as readonly string[]).includes(value) ? (value as T) : fallback;
}

function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) s = `#${s}`;
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  if (HEX_COLOR_RE.test(s)) return s.toUpperCase();
  return null;
}

export function fallbackStyleTokensPayload(): StyleTokensPayloadParsed {
  return {
    tokens: structuredClone(AI_PIPELINE_B1_FALLBACK_TOKENS),
    canvas: {
      width: "600px",
      emailBackground: "#FFFFFF",
      contentSurface: "#FFFFFF",
    },
  };
}
