/**
 * SpacingValue 规范：mode=unified 时 unified 须为单边长度（禁止 CSS 多值简写）。
 * 与 src/lib/validate.ts · validateSpacingValue 一致。
 */

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function spacingSideHasMultiValue(raw) {
  if (raw == null) return false;
  if (typeof raw === "object" && raw.$themeRef) return false;
  if (typeof raw !== "string") return false;
  return /\s/.test(raw.trim());
}

/**
 * @param {unknown} spacing
 * @returns {boolean}
 */
export function spacingObjectViolatesUnifiedSingleValue(spacing) {
  if (!spacing || typeof spacing !== "object" || Array.isArray(spacing)) return false;
  const o = spacing;
  if (o.mode === "unified") {
    return spacingSideHasMultiValue(o.unified);
  }
  if (o.mode === "separate") {
    return ["top", "right", "bottom", "left"].some((side) => spacingSideHasMultiValue(o[side]));
  }
  return false;
}

/**
 * CSS padding 简写 → separate（1–4 段）。
 * @param {string} unified
 */
export function cssPaddingShorthandToSeparate(unified) {
  const parts = unified.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { mode: "unified", unified: parts[0] };
  }
  let top;
  let right;
  let bottom;
  let left;
  if (parts.length === 2) {
    [top, right] = parts;
    bottom = top;
    left = right;
  } else if (parts.length === 3) {
    [top, right, bottom] = parts;
    left = right;
  } else if (parts.length === 4) {
    [top, right, bottom, left] = parts;
  } else {
    throw new Error(`无法解析 padding 简写（${parts.length} 段）：${unified}`);
  }
  return { mode: "separate", top, right, bottom, left };
}

/**
 * @param {unknown} spacing
 * @returns {{ changed: boolean, value: unknown }}
 */
export function normalizeSpacingObject(spacing) {
  if (!spacing || typeof spacing !== "object" || Array.isArray(spacing)) {
    return { changed: false, value: spacing };
  }
  const o = spacing;
  if (o.mode === "unified" && spacingSideHasMultiValue(o.unified)) {
    return {
      changed: true,
      value: cssPaddingShorthandToSeparate(String(o.unified)),
    };
  }
  if (o.mode === "separate") {
    let changed = false;
    /** @type {Record<string, unknown>} */
    const next = { mode: "separate" };
    for (const side of ["top", "right", "bottom", "left"]) {
      const raw = o[side];
      if (spacingSideHasMultiValue(raw)) {
        const one = String(raw).trim().split(/\s+/)[0];
        next[side] = one;
        changed = true;
      } else if (raw !== undefined) {
        next[side] = raw;
      }
    }
    if (changed) return { changed: true, value: next };
  }
  return { changed: false, value: spacing };
}

/**
 * 深度遍历，修复所有 SpacingValue 形态对象。
 * @param {unknown} node
 * @returns {{ changed: boolean, value: unknown, fixes: Array<{ path: string, from: string, to: string }> }}
 */
export function deepNormalizeSpacingValues(node, path = "root") {
  /** @type {Array<{ path: string, from: string, to: string }>} */
  const fixes = [];

  if (!node || typeof node !== "object") {
    return { changed: false, value: node, fixes };
  }

  if (Array.isArray(node)) {
    let changed = false;
    const out = node.map((item, i) => {
      const r = deepNormalizeSpacingValues(item, `${path}[${i}]`);
      if (r.changed) changed = true;
      fixes.push(...r.fixes);
      return r.value;
    });
    return { changed, value: out, fixes };
  }

  if (spacingObjectViolatesUnifiedSingleValue(node)) {
    const before = JSON.stringify(node);
    const { changed, value } = normalizeSpacingObject(node);
    if (changed) {
      fixes.push({ path, from: before, to: JSON.stringify(value) });
      return { changed: true, value, fixes };
    }
  }

  let changed = false;
  /** @type {Record<string, unknown>} */
  const out = { ...node };
  for (const [key, val] of Object.entries(node)) {
    if (val && typeof val === "object") {
      const r = deepNormalizeSpacingValues(val, `${path}.${key}`);
      if (r.changed) {
        changed = true;
        out[key] = r.value;
        fixes.push(...r.fixes);
      }
    }
  }
  return { changed, value: out, fixes };
}

/**
 * @param {unknown} root
 * @returns {Array<{ path: string, unified: string }>}
 */
export function collectSpacingViolations(root) {
  /** @type {Array<{ path: string, unified: string }>} */
  const hits = [];

  function walk(node, p) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${p}[${i}]`));
      return;
    }
    if (node.mode === "unified" && spacingSideHasMultiValue(node.unified)) {
      hits.push({ path: p, unified: String(node.unified) });
    }
    if (node.mode === "separate") {
      for (const side of ["top", "right", "bottom", "left"]) {
        if (spacingSideHasMultiValue(node[side])) {
          hits.push({ path: `${p}.${side}`, unified: String(node[side]) });
        }
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === "object") walk(v, `${p}.${k}`);
    }
  }

  walk(root, "root");
  return hits;
}
