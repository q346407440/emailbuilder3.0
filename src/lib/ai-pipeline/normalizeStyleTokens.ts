import {
  AI_PIPELINE_B1_FALLBACK_TOKENS,
  B1_RADIUS_TIER_ENUMS,
  B1_SPACING_TIER_ENUMS,
  B1_TYPOGRAPHY_TIER_ENUMS,
  parsePxValue,
} from "./b1StyleTierPresets";
import { EMAIL_CONTAINER_SPACING_MAX_PX } from "../spacingPxCap";
import type { NormalizedStyleTokens, StyleTokensResult } from "./types";
import { styleTokensResultSchema } from "./schemas/b1-style-tokens";
import { injectStyleTokensResult } from "./injectPipelineMetadata";
import type { StyleTokensPayload } from "./injectPipelineMetadata";

function isInEnum(value: string, enums: readonly string[]): boolean {
  return enums.includes(value);
}

function clampSpacingValue(raw: string, enums: readonly string[]): string {
  const px = parsePxValue(raw);
  const capped = Math.min(px, EMAIL_CONTAINER_SPACING_MAX_PX);
  let best = enums[0]!;
  let bestDiff = Infinity;
  for (const e of enums) {
    const diff = Math.abs(parsePxValue(e) - capped);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = e;
    }
  }
  return best;
}

function enforceTypographyMonotonicity(tokens: StyleTokensResult["tokens"]): StyleTokensResult["tokens"] {
  const order = ["display", "h1", "body", "caption"] as const;
  const values = order.map((k) => ({
    key: k,
    px: parsePxValue(tokens.typography[k]),
    enums: B1_TYPOGRAPHY_TIER_ENUMS[k],
  }));

  for (let i = 1; i < values.length; i += 1) {
    if (values[i]!.px > values[i - 1]!.px) {
      const prev = values[i - 1]!.px;
      const pick = [...values[i]!.enums]
        .reverse()
        .find((e) => parsePxValue(e) <= prev);
      if (pick) {
        tokens = {
          ...tokens,
          typography: { ...tokens.typography, [values[i]!.key]: pick },
        };
        values[i]!.px = parsePxValue(pick);
      }
    }
  }
  return tokens;
}

function enforceSectionGap(tokens: StyleTokensResult["tokens"]): StyleTokensResult["tokens"] {
  const sectionPx = parsePxValue(tokens.spacing.section);
  const gapPx = parsePxValue(tokens.spacing.gap);
  if (gapPx <= sectionPx) return tokens;
  const pick = [...B1_SPACING_TIER_ENUMS.gap]
    .reverse()
    .find((e) => parsePxValue(e) <= sectionPx);
  if (!pick) return tokens;
  return {
    ...tokens,
    spacing: { ...tokens.spacing, gap: pick },
  };
}

function sanitizeTokens(raw: StyleTokensResult["tokens"]): StyleTokensResult["tokens"] {
  let tokens = { ...raw };

  for (const key of ["section", "gap", "pageInline"] as const) {
    const enums = B1_SPACING_TIER_ENUMS[key];
    if (!isInEnum(tokens.spacing[key], enums)) {
      tokens = {
        ...tokens,
        spacing: {
          ...tokens.spacing,
          [key]: clampSpacingValue(tokens.spacing[key], enums),
        },
      };
    }
  }

  for (const key of ["display", "h1", "body", "caption"] as const) {
    const enums = B1_TYPOGRAPHY_TIER_ENUMS[key];
    if (!isInEnum(tokens.typography[key], enums)) {
      tokens = {
        ...tokens,
        typography: {
          ...tokens.typography,
          [key]: enums[Math.floor(enums.length / 2)]!,
        },
      };
    }
  }

  for (const key of ["panel", "cta"] as const) {
    const enums = B1_RADIUS_TIER_ENUMS[key];
    if (!isInEnum(tokens.radius[key], enums)) {
      tokens = {
        ...tokens,
        radius: {
          ...tokens.radius,
          [key]: enums[0]!,
        },
      };
    }
  }

  tokens = enforceSectionGap(tokens);
  tokens = enforceTypographyMonotonicity(tokens);
  return tokens;
}

export function normalizeStyleTokens(
  input: StyleTokensResult | StyleTokensPayload
): NormalizedStyleTokens {
  const coerced = coerceStyleTokensShape(
    "schemaVersion" in input ? input : injectStyleTokensResult(input)
  );
  const parsed = styleTokensResultSchema.safeParse(coerced);
  if (!parsed.success) {
    return structuredClone(AI_PIPELINE_B1_FALLBACK_TOKENS);
  }
  return sanitizeTokens(parsed.data.tokens);
}

function coerceStyleTokensShape(input: StyleTokensResult): StyleTokensResult {
  const tokens = input.tokens ?? AI_PIPELINE_B1_FALLBACK_TOKENS;
  return {
    schemaVersion: "1",
    tokens: {
      colors: { ...AI_PIPELINE_B1_FALLBACK_TOKENS.colors, ...tokens.colors },
      spacing: {
        section: clampSpacingValue(
          tokens.spacing?.section ?? AI_PIPELINE_B1_FALLBACK_TOKENS.spacing.section,
          B1_SPACING_TIER_ENUMS.section
        ),
        gap: clampSpacingValue(
          tokens.spacing?.gap ?? AI_PIPELINE_B1_FALLBACK_TOKENS.spacing.gap,
          B1_SPACING_TIER_ENUMS.gap
        ),
        pageInline: clampSpacingValue(
          tokens.spacing?.pageInline ?? AI_PIPELINE_B1_FALLBACK_TOKENS.spacing.pageInline,
          B1_SPACING_TIER_ENUMS.pageInline
        ),
      },
      typography: {
        display:
          pickNearestEnum(
            tokens.typography?.display ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.display,
            B1_TYPOGRAPHY_TIER_ENUMS.display
          ) ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.display,
        h1:
          pickNearestEnum(
            tokens.typography?.h1 ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.h1,
            B1_TYPOGRAPHY_TIER_ENUMS.h1
          ) ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.h1,
        body:
          pickNearestEnum(
            tokens.typography?.body ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.body,
            B1_TYPOGRAPHY_TIER_ENUMS.body
          ) ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.body,
        caption:
          pickNearestEnum(
            tokens.typography?.caption ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.caption,
            B1_TYPOGRAPHY_TIER_ENUMS.caption
          ) ?? AI_PIPELINE_B1_FALLBACK_TOKENS.typography.caption,
      },
      radius: {
        panel:
          pickNearestEnum(
            tokens.radius?.panel ?? AI_PIPELINE_B1_FALLBACK_TOKENS.radius.panel,
            B1_RADIUS_TIER_ENUMS.panel
          ) ?? AI_PIPELINE_B1_FALLBACK_TOKENS.radius.panel,
        cta:
          pickNearestEnum(
            tokens.radius?.cta ?? AI_PIPELINE_B1_FALLBACK_TOKENS.radius.cta,
            B1_RADIUS_TIER_ENUMS.cta
          ) ?? AI_PIPELINE_B1_FALLBACK_TOKENS.radius.cta,
      },
    },
    canvas: input.canvas ?? {
      width: "600px",
      emailBackground: "#FFFFFF",
      contentSurface: "#FFFFFF",
    },
  };
}

function pickNearestEnum(raw: string, enums: readonly string[]): string | undefined {
  if (isInEnum(raw, enums)) return raw;
  return clampSpacingValue(raw, enums);
}

export function normalizeStyleTokensOrFallback(input: unknown): NormalizedStyleTokens {
  const parsed = styleTokensResultSchema.safeParse(input);
  if (!parsed.success) {
    return structuredClone(AI_PIPELINE_B1_FALLBACK_TOKENS);
  }
  return sanitizeTokens(parsed.data.tokens);
}

export function buildTokenPresetsFromB1(tokens: NormalizedStyleTokens) {
  return structuredClone(tokens);
}
