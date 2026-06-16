import type { BindingSpec, EmailBlock, EmailTemplate } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import { isThemeRef } from "../types/themeRef";
import { classifyField } from "./blockFieldClassification";
import { getAtPath, setAtPath } from "./paths";
import {
  coercePaddingOnContainer,
  isPaddingFieldSubPath,
} from "./spacingValue";
import {
  getBindingUiMeta,
  getThemeRestoreJson,
  patchBindingUiMeta,
  pathKeyFor,
} from "./bindingUiMeta";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function lookupExpandedThemeValue(theme: ExpandedTheme, tokenPath: string): unknown {
  const segments = tokenPath.split(".");
  let cursor: unknown = theme;
  for (const segment of segments) {
    if (!segment || !isPlainObject(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function materializeThemeRefsWithExpandedTheme(value: unknown, theme: ExpandedTheme): unknown {
  if (isThemeRef(value)) {
    const resolved = lookupExpandedThemeValue(theme, value.$themeRef.trim());
    return typeof resolved === "string" && resolved.trim() ? resolved : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => materializeThemeRefsWithExpandedTheme(item, theme));
  }
  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = materializeThemeRefsWithExpandedTheme(child, theme);
    }
    return next;
  }
  return value;
}

/** 深度检测子树中是否出现 $themeRef */
export function containsThemeRefDeep(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some(containsThemeRefDeep);
  if (isPlainObject(value)) return Object.values(value).some(containsThemeRefDeep);
  return false;
}

/** 仅从模板字面量读取 bindPath 对应值（不走 payload 覆盖） */
export function readTemplateFieldOnly(block: EmailBlock, bindPath: string): unknown {
  const [root, ...rest] = bindPath.split(".");
  const sub = rest.join(".");
  if (root === "props") return getAtPath(block.props as Record<string, unknown>, sub);
  if (root === "wrapperStyle") {
    return getAtPath((block.wrapperStyle ?? {}) as Record<string, unknown>, sub);
  }
  return undefined;
}

export function setTemplateFieldOnly(template: EmailTemplate, blockId: string, bindPath: string, value: unknown): EmailTemplate {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b) return t;
  const [root, ...rest] = bindPath.split(".");
  const sub = rest.join(".");
  if (root === "props") {
    if (sub) setAtPath(b.props as Record<string, unknown>, sub, value);
    else Object.assign(b.props, value as object);
    if (isPaddingFieldSubPath(sub) || (b.props as Record<string, unknown>).padding !== undefined) {
      coercePaddingOnContainer(b.props as Record<string, unknown>);
    }
  } else if (root === "wrapperStyle") {
    if (!b.wrapperStyle) b.wrapperStyle = {};
    if (sub) setAtPath(b.wrapperStyle as Record<string, unknown>, sub, value);
    else Object.assign(b.wrapperStyle, value as object);
    if (isPaddingFieldSubPath(sub) || b.wrapperStyle.padding !== undefined) {
      coercePaddingOnContainer(b.wrapperStyle as Record<string, unknown>);
    }
  }
  return t;
}

function readMergedField(merged: EmailTemplate, blockId: string, bindPath: string): unknown {
  const b = merged.blocks[blockId];
  if (!b) return undefined;
  return readTemplateFieldOnly(b, bindPath);
}

function isSameOrChildBindPath(candidate: string, bindPath: string): boolean {
  return candidate === bindPath || candidate.startsWith(`${bindPath}.`);
}

function readBindingSpecTree(block: EmailBlock, bindPath: string): Record<string, BindingSpec> {
  const bindings = block.bindings ?? {};
  const out: Record<string, BindingSpec> = {};
  for (const [path, spec] of Object.entries(bindings)) {
    if (isSameOrChildBindPath(path, bindPath)) out[path] = spec;
  }
  return out;
}

function setBlockBinding(
  template: EmailTemplate,
  blockId: string,
  bindPath: string,
  spec: BindingSpec | undefined
): EmailTemplate {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b) return t;
  if (!b.bindings && spec) b.bindings = {};
  if (spec) {
    (b.bindings as Record<string, BindingSpec>)[bindPath] = spec;
  } else if (b.bindings) {
    delete b.bindings[bindPath];
    if (Object.keys(b.bindings).length === 0) delete b.bindings;
  }
  return t;
}

function removeBlockBindingTree(template: EmailTemplate, blockId: string, bindPath: string): EmailTemplate {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b?.bindings) return t;
  for (const path of Object.keys(b.bindings)) {
    if (isSameOrChildBindPath(path, bindPath)) delete b.bindings[path];
  }
  if (Object.keys(b.bindings).length === 0) delete b.bindings;
  return t;
}

/**
 * 解除跟随主题：
 * 1) 将 path 烘焙为 merged 中的字面量。
 * 2) 把原始字段子树 JSON 记入 `themeRestoreJson`（标记已解除跟随，供 UI 识别）。
 * 3) 从 block.bindings 移除该 binding，避免胶囊读到「mode: theme」与字段值已是字面量不一致。
 */
function fieldFollowsThemeBinding(block: EmailBlock, bindPath: string): boolean {
  const spec = block.bindings?.[bindPath];
  return Boolean(spec && spec.mode === "theme");
}

/** 解除跟随时写入 themeRestoreJson 的字段快照（优先保留模板内 $themeRef 子树） */
function themeDetachValueSnapshot(block: EmailBlock, bindPath: string, raw: unknown): string {
  if (containsThemeRefDeep(raw)) {
    return JSON.stringify(raw === undefined ? null : raw);
  }
  const tokenPath = block.bindings?.[bindPath]?.tokenPath;
  if (tokenPath) {
    return JSON.stringify({ $themeRef: tokenPath });
  }
  return JSON.stringify(raw === undefined ? null : raw);
}

export function detachThemeFieldBranch(
  template: EmailTemplate,
  merged: EmailTemplate,
  blockId: string,
  bindPath: string,
  options?: {
    /** 当前生效主题，用于兜底烘焙仍残留的 $themeRef。 */
    effectiveTheme?: ExpandedTheme | null;
    /** UI 已经解析出的展示字面量；优先写回。 */
    literalValue?: unknown;
  }
): EmailTemplate {
  const block = template.blocks[blockId];
  if (!block) return template;
  const raw = readTemplateFieldOnly(block, bindPath);
  if (!containsThemeRefDeep(raw) && !fieldFollowsThemeBinding(block, bindPath)) return template;
  const pk = pathKeyFor(blockId, bindPath);
  const valueSnapshot = themeDetachValueSnapshot(block, bindPath, raw);
  const bindingTree = readBindingSpecTree(block, bindPath);
  const mergedVal = readMergedField(merged, blockId, bindPath);
  const initialWrite =
    options && "literalValue" in options
      ? options.literalValue
      : mergedVal === undefined
        ? raw
        : mergedVal;
  const toWrite =
    options?.effectiveTheme && containsThemeRefDeep(initialWrite)
      ? materializeThemeRefsWithExpandedTheme(initialWrite, options.effectiveTheme)
      : initialWrite;
  let next = setTemplateFieldOnly(template, blockId, bindPath, toWrite);
  if (Object.keys(bindingTree).length > 0) {
    next = removeBlockBindingTree(next, blockId, bindPath);
  }
  next = patchBindingUiMeta(next, (prev) => ({
    ...prev,
    themeRestoreJson: { ...prev.themeRestoreJson, [pk]: valueSnapshot },
  }));
  return next;
}

export function isThemeDetached(template: EmailTemplate, blockId: string, bindPath: string): boolean {
  const pk = pathKeyFor(blockId, bindPath);
  return Boolean(getBindingUiMeta(template).themeRestoreJson?.[pk]);
}

export function hasThemeRefInTemplateField(template: EmailTemplate, blockId: string, bindPath: string): boolean {
  const b = template.blocks[blockId];
  if (!b) return false;
  // 优先读 bindings 元信息（来源胶囊体系）：mode === "theme" 即视为跟随主题。
  // 兜底回退到字段值的 $themeRef 判断，保持对未 decorate 模板的兼容。
  const spec = b.bindings?.[bindPath];
  if (spec && spec.mode === "theme") return true;
  return containsThemeRefDeep(readTemplateFieldOnly(b, bindPath));
}

/** 读取字段当前或解除跟随前快照中的令牌路径（用于胶囊菜单高亮）。 */
export function readThemeTokenPathForField(
  template: EmailTemplate,
  blockId: string,
  bindPath: string
): string | undefined {
  const b = template.blocks[blockId];
  if (!b) return undefined;
  const fromBinding = b.bindings?.[bindPath]?.tokenPath;
  if (fromBinding) return fromBinding.trim() || undefined;
  const raw = readTemplateFieldOnly(b, bindPath);
  if (isThemeRef(raw)) return raw.$themeRef.trim() || undefined;

  if (containsThemeRefDeep(raw)) {
    const walk = (v: unknown): string | undefined => {
      if (isThemeRef(v)) return v.$themeRef.trim() || undefined;
      if (Array.isArray(v)) {
        for (const item of v) {
          const hit = walk(item);
          if (hit) return hit;
        }
      }
      if (isPlainObject(v)) {
        for (const item of Object.values(v)) {
          const hit = walk(item);
          if (hit) return hit;
        }
      }
      return undefined;
    };
    const fromRaw = walk(raw);
    if (fromRaw) return fromRaw;
  }

  const prefix = `${bindPath}.`;
  const childTokenPaths = new Set<string>();
  for (const [path, spec] of Object.entries(b.bindings ?? {})) {
    if (path !== bindPath && !path.startsWith(prefix)) continue;
    if (spec.mode !== "theme" || !spec.tokenPath?.trim()) continue;
    childTokenPaths.add(spec.tokenPath.trim());
  }
  if (childTokenPaths.size >= 1) return [...childTokenPaths][0];

  const pk = pathKeyFor(blockId, bindPath);
  const restoreJson = getThemeRestoreJson(template, pk);
  if (!restoreJson) return undefined;
  try {
    const parsed = JSON.parse(restoreJson) as unknown;
    if (isThemeRef(parsed)) return parsed.$themeRef.trim() || undefined;
    if (containsThemeRefDeep(parsed)) {
      const walk = (v: unknown): string | undefined => {
        if (isThemeRef(v)) return v.$themeRef.trim() || undefined;
        if (Array.isArray(v)) {
          for (const item of v) {
            const hit = walk(item);
            if (hit) return hit;
          }
        }
        if (isPlainObject(v)) {
          for (const item of Object.values(v)) {
            const hit = walk(item);
            if (hit) return hit;
          }
        }
        return undefined;
      };
      return walk(parsed);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** 将样式字段绑定到指定标准令牌（写入 $themeRef + bindings.mode=theme）。 */
export function applyThemeTokenBinding(
  template: EmailTemplate,
  blockId: string,
  bindPath: string,
  tokenPath: string
): EmailTemplate {
  const block = template.blocks[blockId];
  if (!block) return template;
  const normalized = tokenPath.trim();
  if (!normalized) return template;

  let next = setTemplateFieldOnly(template, blockId, bindPath, { $themeRef: normalized });
  next = setBlockBinding(next, blockId, bindPath, {
    slotId: normalized,
    mode: "theme",
    tokenPath: normalized,
    fieldKind: classifyField(block.type, bindPath),
  });

  const pk = pathKeyFor(blockId, bindPath);
  if (getThemeRestoreJson(next, pk) !== undefined) {
    next = patchBindingUiMeta(next, (prev) => {
      const tr = { ...prev.themeRestoreJson };
      delete tr[pk];
      const trb = prev.themeRestoreBindingJson ? { ...prev.themeRestoreBindingJson } : undefined;
      if (trb) delete trb[pk];
      return {
        ...prev,
        themeRestoreJson: Object.keys(tr).length ? tr : undefined,
        themeRestoreBindingJson:
          trb && Object.keys(trb).length ? trb : undefined,
      };
    });
  }
  return next;
}
