import { isStandardThemeRefPath } from "../../token-preset-contract/theme-ref-paths";
import {
  COMPACT_STYLE_BIND_SUFFIX,
  COMPACT_STYLE_NESTED_GROUP_KEYS,
  type CompactStyleRawValue,
  type NormalizedAgentStyleField,
} from "../../layout-variant-ai-contract/agentStyleKeys";
import type { NormalizedStyleTokens } from "./types";
import {
  isValidFontSizeLiteral,
  resolveTokenPathLiteral,
  resolveValidFontSize,
} from "./literalStyleExpand";
import { textColorMayBindPrimaryToken } from "./semanticStyleDefaults";

export type AgentStyleFieldKind =
  | "text-color"
  | "icon-color"
  | "button-bg-color"
  | "button-text-color"
  | "container-bg-color"
  | "font-size"
  | "button-font-size"
  | "scalar";

export type ResolvedAgentStyleField = {
  /** 落盘字面量（绑定失败时仍可用）。 */
  literal?: string;
  /** 解析成功时写入 $themeRef。 */
  tokenPath?: string;
  source: "bind" | "literal" | "fallback" | "none";
};

const FOREGROUND_COLOR_PATHS = ["colors.primary", "colors.secondary"] as const;
const CONTAINER_BG_COLOR_PATHS = [
  "colors.surface",
  "colors.primary",
  "colors.secondary",
] as const;

function isStyleValueObject(v: unknown): v is { literal: string; tokenPath?: string } {
  return (
    Boolean(v) &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    typeof (v as { literal?: unknown }).literal === "string"
  );
}

function isNestedStyleGroupKey(key: string): boolean {
  return (COMPACT_STYLE_NESTED_GROUP_KEYS as readonly string[]).includes(key);
}

/** 嵌套分组（如 buttonStyle）或 `{ literal, tokenPath }` 以外的 plain object。 */
function isNestedStyleGroup(raw: CompactStyleRawValue): raw is Record<string, CompactStyleRawValue> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (isStyleValueObject(raw)) return false;
  return true;
}

/**
 * 将 Agent 输出的 styleKeys 展平为 `buttonStyle.backgroundColor` 等叶子键，供后续 *Bind 合并。
 */
export function flattenCompactStyleKeys(
  styleKeys: Record<string, CompactStyleRawValue> | undefined
): Record<string, CompactStyleRawValue> {
  if (!styleKeys) return {};
  const flat: Record<string, CompactStyleRawValue> = {};
  for (const [key, raw] of Object.entries(styleKeys)) {
    if (isNestedStyleGroupKey(key) && isNestedStyleGroup(raw)) {
      for (const [subKey, subVal] of Object.entries(raw)) {
        flat[`${key}.${subKey}`] = subVal;
      }
      continue;
    }
    flat[key] = raw;
  }
  return flat;
}

/** 将 LLM styleKeys 条目解析为 literal + 可选 tokenPath。 */
export function parseCompactStyleRawValue(raw: CompactStyleRawValue): NormalizedAgentStyleField {
  if (isStyleValueObject(raw)) {
    const literal = raw.literal.trim() || undefined;
    const tokenPath = typeof raw.tokenPath === "string" ? raw.tokenPath.trim() : undefined;
    return { literal, tokenPath: tokenPath || undefined };
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    return t ? { literal: t } : {};
  }
  return {};
}

/** 合并主键与 *Bind 后缀键（如 color + colorBind）。 */
export function normalizeStyleKeysFromCompact(
  styleKeys: Record<string, CompactStyleRawValue> | undefined
): Map<string, NormalizedAgentStyleField> {
  const out = new Map<string, NormalizedAgentStyleField>();
  const flattened = flattenCompactStyleKeys(styleKeys);
  if (!Object.keys(flattened).length) return out;

  for (const [key, raw] of Object.entries(flattened)) {
    if (key.endsWith(COMPACT_STYLE_BIND_SUFFIX)) continue;
    const bindKey = `${key}${COMPACT_STYLE_BIND_SUFFIX}`;
    const bindRaw = flattened[bindKey];
    const base = parseCompactStyleRawValue(raw);
    let tokenPath = base.tokenPath;
    if (bindRaw != null) {
      const bindParsed = parseCompactStyleRawValue(
        typeof bindRaw === "string" ? bindRaw : bindRaw
      );
      if (typeof bindRaw === "string" && bindRaw.trim()) {
        tokenPath = bindRaw.trim();
      } else if (bindParsed.tokenPath) {
        tokenPath = bindParsed.tokenPath;
      }
    }
    out.set(key, { literal: base.literal, tokenPath });
  }
  return out;
}

function normalizeTokenPathForValidation(path: string): string | undefined {
  const t = path.trim();
  if (!t) return undefined;
  if (isStandardThemeRefPath(t)) return t;
  if (/^(primary|secondary|surface)$/.test(t)) return `colors.${t}`;
  if (/^(display|h1|body|caption)$/.test(t)) return `tokens.typography.${t}`;
  if (/^(cta|panel)$/.test(t)) return `tokens.radius.${t}`;
  return undefined;
}

function allowedTokenPathsForKind(kind: AgentStyleFieldKind): readonly string[] {
  switch (kind) {
    case "text-color":
    case "icon-color":
      return FOREGROUND_COLOR_PATHS;
    case "button-text-color":
      return FOREGROUND_COLOR_PATHS;
    case "button-bg-color":
      return ["colors.primary", "colors.secondary"] as const;
    case "container-bg-color":
      return CONTAINER_BG_COLOR_PATHS;
    case "font-size":
    case "button-font-size":
      return [
        "tokens.typography.display",
        "tokens.typography.h1",
        "tokens.typography.body",
        "tokens.typography.caption",
      ] as const;
    case "button-border-radius":
      return ["tokens.radius.cta", "tokens.radius.panel"] as const;
    default:
      return [];
  }
}

function validateTokenPathForKind(
  tokenPath: string | undefined,
  kind: AgentStyleFieldKind,
  tokens: NormalizedStyleTokens,
  opts?: { textColorLiteral?: string }
): string | undefined {
  if (!tokenPath) return undefined;
  const normalized =
    normalizeTokenPathForValidation(tokenPath) ??
    (isStandardThemeRefPath(tokenPath) ? tokenPath.trim() : undefined);
  if (!normalized || !isStandardThemeRefPath(normalized)) return undefined;

  const allowed = allowedTokenPathsForKind(kind);
  if (allowed.length > 0 && !allowed.includes(normalized as (typeof allowed)[number])) {
    return undefined;
  }

  if (kind === "text-color" && normalized === "colors.primary") {
    const primary = tokens.colors.primary;
    const lit = opts?.textColorLiteral;
    if (!lit || !textColorMayBindPrimaryToken(lit, primary)) return undefined;
  }

  if (kind === "text-color" && normalized === "colors.surface") {
    return undefined;
  }

  if (kind === "button-text-color" && normalized === "colors.surface") {
    return undefined;
  }

  return normalized;
}

function resolveLiteralForKind(
  literal: string | undefined,
  kind: AgentStyleFieldKind,
  tokens: NormalizedStyleTokens
): string | undefined {
  if (!literal) return undefined;
  if (kind === "font-size" || kind === "button-font-size") {
    return resolveValidFontSize(literal, tokens);
  }
  if (kind.startsWith("text-color") || kind.includes("color")) {
    return literal.trim() || undefined;
  }
  return literal.trim() || undefined;
}

/**
 * 解析单字段：tokenPath 合法 → bind；否则 literal；否则 undefined。
 */
export function resolveAgentStyleField(
  field: NormalizedAgentStyleField,
  kind: AgentStyleFieldKind,
  tokens: NormalizedStyleTokens
): ResolvedAgentStyleField {
  const literalResolved = resolveLiteralForKind(field.literal, kind, tokens);
  const tokenPath = validateTokenPathForKind(field.tokenPath, kind, tokens, {
    textColorLiteral: literalResolved,
  });

  if (tokenPath) {
    return { literal: literalResolved, tokenPath, source: "bind" };
  }
  if (literalResolved) {
    return { literal: literalResolved, source: "literal" };
  }
  return { source: "none" };
}

export function styleKeyToFieldKind(styleKey: string): AgentStyleFieldKind {
  if (styleKey === "color") return "text-color";
  if (styleKey === "backgroundColor") return "container-bg-color";
  if (styleKey === "fontSize") return "font-size";
  if (styleKey === "buttonStyle.backgroundColor") return "button-bg-color";
  if (styleKey === "buttonStyle.textColor") return "button-text-color";
  if (styleKey === "buttonStyle.fontSize") return "button-font-size";
  if (styleKey === "buttonStyle.borderRadius") return "button-border-radius";
  return "scalar";
}

export function bindPathForStyleKey(styleKey: string): string {
  if (styleKey.startsWith("buttonStyle.")) {
    return `props.${styleKey}`;
  }
  if (styleKey === "backgroundColor") return "wrapperStyle.backgroundColor";
  return `props.${styleKey}`;
}
