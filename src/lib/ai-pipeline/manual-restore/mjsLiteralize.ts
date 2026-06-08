/**
 * 豆包 mjs 后处理：template 树用字面量，不用 $themeRef / bindings。
 * tokenPresets 仍可保留（供编辑器主题档位），但执行前剥掉主题绑定写法。
 */

const DEFAULT_TOKEN_LITERALS: Record<string, string> = {
  "colors.primary": "#000000",
  "colors.secondary": "#333333",
  "colors.surface": "#FFFFFF",
  "tokens.spacing.section": "24px",
  "tokens.spacing.gap": "16px",
  "tokens.spacing.pageInline": "20px",
  "tokens.typography.display": "36px",
  "tokens.typography.h1": "24px",
  "tokens.typography.body": "16px",
  "tokens.typography.caption": "12px",
  "tokens.radius.panel": "16px",
  "tokens.radius.cta": "9999px",
};

/** 从 mjs 内 tokenPresets 常量提取 path→字面量，供 themeRef 替换。 */
export function extractTokenLiteralsFromMjs(source: string): Record<string, string> {
  const map = { ...DEFAULT_TOKEN_LITERALS };
  const tpMatch = /const tokenPresets = (\{[\s\S]*?\n\};)/m.exec(source);
  if (!tpMatch) return map;

  const block = tpMatch[1]!;
  const assign = (re: RegExp, path: string) => {
    const m = re.exec(block);
    if (m?.[1]) map[path] = m[1];
  };
  assign(/primary:\s*(COLORS\.\w+|'[^']+'|"[^"]+")/, "colors.primary");
  assign(/secondary:\s*(COLORS\.\w+|'[^']+'|"[^"]+")/, "colors.secondary");
  assign(/surface:\s*(COLORS\.\w+|'[^']+'|"[^"]+")/, "colors.surface");
  assign(/section:\s*'([^']+)'/, "tokens.spacing.section");
  assign(/gap:\s*'([^']+)'/, "tokens.spacing.gap");
  assign(/pageInline:\s*'([^']+)'/, "tokens.spacing.pageInline");
  assign(/display:\s*'([^']+)'/, "tokens.typography.display");
  assign(/\bh1:\s*'([^']+)'/, "tokens.typography.h1");
  assign(/\bbody:\s*'([^']+)'/, "tokens.typography.body");
  assign(/caption:\s*'([^']+)'/, "tokens.typography.caption");
  assign(/panel:\s*'([^']+)'/, "tokens.radius.panel");
  assign(/\bcta:\s*'([^']+)'/, "tokens.radius.cta");
  return map;
}

function literalForPath(map: Record<string, string>, path: string): string {
  const v = map[path.trim()];
  if (!v) return "'16px'";
  if (v.startsWith("COLORS.")) return v;
  return `'${v.replace(/^'|'$/g, "")}'`;
}

/** 去掉 bindings 属性（单行或多行）。 */
function stripBindingsProperties(source: string): string {
  let out = source;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const m = /,\s*\n(\s*)bindings:\s*\{/.exec(out);
    if (!m) break;
    const start = m.index;
    const indent = m[1]!;
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < out.length && depth > 0) {
      if (out[i] === "{") depth += 1;
      if (out[i] === "}") depth -= 1;
      i += 1;
    }
    while (out[i] === "," || out[i] === "\n" || out[i] === " ") i += 1;
    out = out.slice(0, start) + out.slice(i);
  }
  return out.replace(/\n(\s*)bindings:\s*\{\s*\},?\n/g, "\n");
}

/** themeRef / $themeRef → 字面量；移除 bindings。 */
export function literalizeMjsThemeRefs(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const map = extractTokenLiteralsFromMjs(source);
  let out = source;

  out = out.replace(/themeRef\(\s*['"]([^'"]+)['"]\s*\)/g, (_full, path: string) => {
    fixes.push(`themeRef→字面量 ${path}`);
    return literalForPath(map, path);
  });

  out = out.replace(/\{\s*\$themeRef:\s*['"]([^'"]+)['"]\s*\}/g, (_full, path: string) => {
    fixes.push(`$themeRef→字面量 ${path}`);
    return literalForPath(map, path);
  });

  const beforeBindings = out;
  out = stripBindingsProperties(out);
  if (out !== beforeBindings) fixes.push("删除 bindings");

  return { source: out, fixes: [...new Set(fixes)] };
}
