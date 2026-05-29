import type { EmailBlock, EmailTemplate } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import { isThemeRef, parseThemeRefPath } from "../types/themeRef";
import type { ValidationIssue } from "./validate";

type ResolveState = {
  theme: ExpandedTheme;
  issues: ValidationIssue[];
  block?: EmailBlock;
};

const CSS_SCALAR_FIELD_NAMES = new Set([
  "backgroundColor",
  "color",
  "textColor",
  "fontSize",
  "lineHeight",
  "gap",
  "cellWidth",
  "cellHeight",
  "height",
  "width",
  /** indicator.progress 槽/进度色 */
  "trackColor",
  "fillColor",
]);

const SPACING_FIELD_NAMES = new Set(["unified", "top", "right", "bottom", "left"]);
const BORDER_RADIUS_FIELD_NAMES = new Set(["radius", "topLeft", "topRight", "bottomRight", "bottomLeft"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function lookupThemeValue(theme: ExpandedTheme, path: string): unknown {
  const segments = path.split(".");
  let cursor: unknown = theme;
  for (const segment of segments) {
    if (!segment) return undefined;
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function hasThemeRefShape(value: unknown): boolean {
  return isPlainObject(value) && "$themeRef" in value;
}

function isThemeRefAllowed(relativePath: string): boolean {
  const parts = relativePath.split(".");
  const last = parts.at(-1) ?? "";
  if (CSS_SCALAR_FIELD_NAMES.has(last)) return true;

  const parent = parts.at(-2) ?? "";
  if (parent === "padding" && SPACING_FIELD_NAMES.has(last)) return true;
  if (parent === "borderRadius" && BORDER_RADIUS_FIELD_NAMES.has(last)) return true;
  if (parent === "border" && (last === "color" || last === "width")) return true;
  if (
    parts.length >= 3 &&
    parts.at(-3) === "border" &&
    (parent === "top" || parent === "right" || parent === "bottom" || parent === "left") &&
    last === "width"
  ) {
    return true;
  }
  return false;
}

function resolveValue(value: unknown, path: string, relativePath: string, state: ResolveState): unknown {
  if (isThemeRef(value)) {
    if (!isThemeRefAllowed(relativePath)) {
      state.issues.push({ path, reason: "该字段不允许使用 $themeRef" });
      return value;
    }
    const refPath = parseThemeRefPath(value);
    if (!refPath) {
      state.issues.push({ path, reason: "$themeRef 缺少路径" });
      return value;
    }
    let resolved: unknown;
    resolved = lookupThemeValue(state.theme, refPath);
    if (typeof resolved !== "string" || resolved.trim() === "") {
      state.issues.push({
        path,
        reason: `$themeRef「${refPath}」无法解析为非空字符串`,
      });
      return value;
    }
    return resolved;
  }

  if (hasThemeRefShape(value)) {
    state.issues.push({ path, reason: "$themeRef 必须是仅包含字符串路径的对象" });
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => resolveValue(item, `${path}[${index}]`, relativePath, state));
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const childRelativePath = relativePath ? `${relativePath}.${key}` : key;
      out[key] = resolveValue(child, `${path}.${key}`, childRelativePath, state);
    }
    return out;
  }

  return value;
}

function resolveBlock(block: EmailBlock, state: ResolveState): EmailBlock {
  const next = structuredClone(block) as EmailBlock;
  const blockState: ResolveState = { ...state, block };
  if (next.props) {
    next.props = resolveValue(next.props, `blocks.${next.id}.props`, "props", blockState) as EmailBlock["props"];
  }
  if (next.wrapperStyle) {
    next.wrapperStyle = resolveValue(
      next.wrapperStyle,
      `blocks.${next.id}.wrapperStyle`,
      "wrapperStyle",
      blockState
    ) as EmailBlock["wrapperStyle"];
  }
  return next;
}

export function resolveThemeInTemplate(
  template: EmailTemplate,
  effectiveTheme: ExpandedTheme
): { template: EmailTemplate | null; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const state: ResolveState = { theme: effectiveTheme, issues };
  const next = structuredClone(template) as EmailTemplate;
  next.blocks = Object.fromEntries(
    Object.entries(template.blocks).map(([id, block]) => [id, resolveBlock(block, state)])
  );

  if (issues.length > 0) {
    return { template: null, issues };
  }
  return { template: next, issues: [] };
}

export function bakeThemeRefs(template: EmailTemplate, effectiveTheme: ExpandedTheme): EmailTemplate {
  const resolved = resolveThemeInTemplate(template, effectiveTheme);
  if (!resolved.template) {
    const summary = resolved.issues.map((issue) => `${issue.path}：${issue.reason}`).join("；");
    throw new Error(`themeRef 烘焙失败：${summary}`);
  }
  return resolved.template;
}
