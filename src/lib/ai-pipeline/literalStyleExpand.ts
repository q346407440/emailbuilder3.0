import { tokenStoragePath } from "../../token-preset-contract/standard-keys";
import type { CompactStyleRawValue } from "../../layout-variant-ai-contract/agentStyleKeys";
import type { EmailBlock } from "../../types/email";
import { isThemeRef } from "../../types/themeRef";
import { classifyField } from "../blockFieldClassification";
import type { NormalizedStyleTokens } from "./types";
import {
  bindPathForStyleKey,
  normalizeStyleKeysFromCompact,
  resolveAgentStyleField,
  styleKeyToFieldKind,
} from "./agentStyleValue";

const TOKEN_PATH_RE = /^(colors|spacing|typography|radius)\.([a-zA-Z0-9]+)$/;
const TOKENS_PREFIX_RE = /^tokens\.(colors|spacing|typography|radius)\.([a-zA-Z0-9]+)$/;
const FONT_SIZE_LITERAL_RE = /^\d+(\.\d+)?(px|em|rem|%)$/;

export type StyleKeysApplyResult = {
  props: Record<string, unknown>;
  wrapperStyle: Record<string, unknown>;
  /** 已在字段写入 $themeRef 的 bindPath（供 E 跳过 legacy 猜绑）。 */
  agentBoundPaths: string[];
};

export function isValidFontSizeLiteral(value: string): boolean {
  return FONT_SIZE_LITERAL_RE.test(value.trim());
}

/** styleKeys / LLM 杂项值 → 布尔；undefined/null 用 fallback。 */
export function coerceBoolean(value: unknown, fallback = false): boolean {
  if (value === true || value === false) return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  if (value == null) return fallback;
  return fallback;
}

/** 12 键点路径 → 字面量值。 */
export function resolveTokenPathLiteral(
  path: string,
  tokens: NormalizedStyleTokens
): string | undefined {
  const m = TOKEN_PATH_RE.exec(path) ?? TOKENS_PREFIX_RE.exec(path);
  if (!m) return undefined;
  const family = m[1] as keyof NormalizedStyleTokens;
  const scale = m[2]!;
  const group = tokens[family] as Record<string, string> | undefined;
  return group?.[scale];
}

/**
 * 解析合法字号：px/em/rem/% 字面量，或 typography.* 点路径展开后的合法字面量。
 * 裸写 h1/caption 等语义档名视为非法，返回 undefined。
 */
export function resolveValidFontSize(
  raw: unknown,
  tokens: NormalizedStyleTokens
): string | undefined {
  if (raw == null) return undefined;
  const str = String(raw).trim();
  if (!str) return undefined;

  if (isValidFontSizeLiteral(str)) return str;

  const tokenLiteral = resolveTokenPathLiteral(str, tokens);
  if (tokenLiteral && isValidFontSizeLiteral(tokenLiteral)) return tokenLiteral;

  return undefined;
}

/** 非法或省略的字号 → B1 正文字号档（typography.body）。 */
export function resolveFontSizeOrBodyDefault(
  raw: unknown,
  tokens: NormalizedStyleTokens
): string {
  return resolveValidFontSize(raw, tokens) ?? tokens.typography.body;
}

function writeResolvedToTargets(
  styleKey: string,
  resolved: ReturnType<typeof resolveAgentStyleField>,
  props: Record<string, unknown>,
  wrapperStyle: Record<string, unknown>,
  agentBoundPaths: string[],
  bindPath: string
): void {
  const useThemeRef = Boolean(resolved.tokenPath);
  const value = useThemeRef
    ? { $themeRef: resolved.tokenPath! }
    : resolved.literal;

  if (value === undefined) return;

  if (styleKey.startsWith("buttonStyle.")) {
    const sub = styleKey.slice("buttonStyle.".length);
    const buttonStyle = { ...((props.buttonStyle as Record<string, unknown>) ?? {}) };
    if (sub === "borderRadius") {
      const radiusVal = useThemeRef ? value : resolved.literal;
      if (radiusVal !== undefined) {
        buttonStyle.borderRadius = { mode: "unified", radius: radiusVal };
        if (useThemeRef) {
          agentBoundPaths.push(`${bindPath}.radius`);
        }
      }
    } else if (useThemeRef) {
      buttonStyle[sub] = value;
      agentBoundPaths.push(bindPath);
    } else {
      buttonStyle[sub] = resolved.literal;
    }
    props.buttonStyle = buttonStyle;
    return;
  }

  if (styleKey === "backgroundColor") {
    if (useThemeRef) {
      wrapperStyle.backgroundColor = value;
      agentBoundPaths.push(bindPath);
    } else {
      wrapperStyle.backgroundColor = resolved.literal;
    }
    return;
  }

  if (styleKey === "borderRadius" && resolved.literal) {
    wrapperStyle.borderRadius = { mode: "unified", radius: resolved.literal };
    return;
  }

  if (useThemeRef) {
    props[styleKey] = value;
    agentBoundPaths.push(bindPath);
  } else if (resolved.literal !== undefined) {
    props[styleKey] = resolved.literal;
  }
}

/** 将 C styleKeys 合并到 props/wrapper（字面量保底 + 可选 Agent tokenPath 绑定）。 */
export function applyStyleKeysToBlockFields(
  styleKeys: Record<string, CompactStyleRawValue> | undefined,
  tokens: NormalizedStyleTokens,
  base: {
    props?: Record<string, unknown>;
    wrapperStyle?: Record<string, unknown>;
  }
): StyleKeysApplyResult {
  const props = { ...(base.props ?? {}) };
  const wrapperStyle = { ...(base.wrapperStyle ?? {}) };
  const agentBoundPaths: string[] = [];

  if (!styleKeys) {
    return { props, wrapperStyle, agentBoundPaths };
  }

  const normalized = normalizeStyleKeysFromCompact(styleKeys);

  for (const [key, raw] of Object.entries(styleKeys)) {
    if (key.endsWith("Bind")) continue;
    if (key === "bold" || key === "italic") {
      props[key] = coerceBoolean(raw, false);
    }
  }

  for (const [styleKey, field] of normalized) {
    if (styleKey === "bold" || styleKey === "italic") continue;

    const kind = styleKeyToFieldKind(styleKey);
    const resolved = resolveAgentStyleField(field, kind, tokens);
    const bindPath = bindPathForStyleKey(styleKey);

    if (styleKey === "fontSize") {
      if (resolved.tokenPath) {
        props.fontSize = { $themeRef: resolved.tokenPath };
        agentBoundPaths.push(bindPath);
      } else if (resolved.literal) {
        props.fontSize = resolved.literal;
      }
      continue;
    }

    writeResolvedToTargets(styleKey, resolved, props, wrapperStyle, agentBoundPaths, bindPath);
  }

  return { props, wrapperStyle, agentBoundPaths };
}

/** 为已落盘 block 登记 Agent 主题绑定（bindings + $themeRef）。 */
export function attachAgentThemeBindingsToBlock(
  block: EmailBlock,
  bindPaths: string[]
): void {
  if (!bindPaths.length) return;
  if (!block.bindings) block.bindings = {};
  for (const bindPath of bindPaths) {
    const [root, ...rest] = bindPath.split(".");
    const sub = rest.join(".");
    let raw: unknown;
    if (root === "props") {
      raw = sub ? readNested(block.props as Record<string, unknown>, sub) : block.props;
    } else if (root === "wrapperStyle") {
      raw = sub
        ? readNested((block.wrapperStyle ?? {}) as Record<string, unknown>, sub)
        : block.wrapperStyle;
    } else {
      continue;
    }
    if (!isThemeRef(raw)) continue;
    const tokenPath = raw.$themeRef.trim();
    if (!tokenPath) continue;
    block.bindings[bindPath] = {
      slotId: tokenPath,
      mode: "theme",
      tokenPath,
      fieldKind: classifyField(block.type, bindPath),
    };
  }
}

function readNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function tokenPath(family: string, scale: string): string {
  return tokenStoragePath(family as "colors", scale);
}
