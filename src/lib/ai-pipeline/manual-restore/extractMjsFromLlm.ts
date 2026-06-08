/** 从豆包响应中提取 mjs body（COLORS…template；不含 header/footer）。 */
export function extractMjsBodyFromLlm(raw: string): string {
  let text = stripMarkdownFences(raw.trim());

  if (text.includes("#!/usr/bin/env node") || /\bconst\s+EMAIL\s*=/.test(text)) {
    text = stripLegacyFullMjsWrapper(text);
  }

  if (text.includes("writeFileSync") || text.includes("mkdirSync(OUT")) {
    text = stripLegacyFooterFromBody(text);
  }

  assertMjsBodyComplete(text);
  return text.trim();
}

function stripMarkdownFences(raw: string): string {
  const fenced = /^```(?:javascript|js|mjs)?\s*([\s\S]*?)```\s*$/im.exec(raw);
  if (fenced) return fenced[1]!.trim();

  const fences = [...raw.matchAll(/```(?:javascript|js|mjs)?\s*([\s\S]*?)```/gi)];
  if (fences.length > 0) {
    const best = fences.reduce((a, b) => (a[1]!.length >= b[1]!.length ? a : b));
    return best[1]!.trim();
  }

  if (raw.startsWith("```")) {
    let text = raw.replace(/^```(?:javascript|js|mjs)?\s*/i, "");
    const close = text.lastIndexOf("```");
    if (close >= 0) text = text.slice(0, close);
    return text.trim();
  }
  return raw;
}

/** 兼容旧 prompt：剥掉 shebang/import/路径/资产块。 */
function stripLegacyFullMjsWrapper(source: string): string {
  const bodyStartRe =
    /(?:\/\/ __INJECTED_ASSETS__\s*\n|const PEXELS =|const ICON =|const COLORS =|function borderNone|function sectionShell|function themeRef)/;
  const startMatch = bodyStartRe.exec(source);
  if (!startMatch || startMatch.index == null) {
    throw new Error("无法从完整 mjs 中定位 body 起点（期望 COLORS / 助手函数）");
  }
  let body = source.slice(startMatch.index);
  if (body.startsWith("// __INJECTED_ASSETS__")) {
    body = body.replace(/^\/\/ __INJECTED_ASSETS__\s*\n/, "");
    body = body.replace(/^const PEXELS =[\s\S]*?;\s*\n\s*const ICON =[\s\S]*?;\s*\n?/, "");
  } else if (body.startsWith("const PEXELS =")) {
    body = body.replace(/^const PEXELS =[\s\S]*?;\s*\n\s*const ICON =[\s\S]*?;\s*\n?/, "");
  }
  return body.trimStart();
}

function stripLegacyFooterFromBody(source: string): string {
  const footerRe = /\n(?:const meta =|mkdirSync\(OUT)/;
  const m = footerRe.exec(source);
  if (m?.index != null && m.index > 0) {
    return source.slice(0, m.index).trimEnd();
  }
  return source;
}

/** 豆包 body 段校验（拼接 header/footer 前）。 */
export function assertMjsBodyComplete(body: string): void {
  const errors: string[] = [];
  if (!body.includes("const tokenPresets") && !body.includes("const template")) {
    errors.push("body 缺少 tokenPresets 或 template");
  }
  if (!/function buildS\d|buildS\d\s*\(/.test(body)) {
    errors.push("body 缺少 buildS* 模块函数");
  }
  if (body.includes("#!/usr/bin/env node")) {
    errors.push("body 不应含 shebang（由程序拼接 header）");
  }
  if (/\bwriteFileSync\b/.test(body)) {
    errors.push("body 不应含 writeFileSync（由程序拼接 footer）");
  }

  let depth = 0;
  for (const ch of body) {
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
  }
  if (depth !== 0) {
    errors.push(`body 大括号未闭合（depth=${depth}）`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("；"));
  }
}

/** 从豆包响应中提取可执行的 generate-manual-*.mjs 源码（完整脚本，供旧路径/测试）。 */
export function extractMjsFromLlm(raw: string): string {
  let text = stripMarkdownFences(raw.trim());

  if (text.includes("#!/usr/bin/env node") || text.includes("writeFileSync")) {
    return text;
  }
  throw new Error("无法从 LLM 响应提取 mjs 源码（缺少代码块或 writeFileSync）");
}

/** 从生成的 mjs 中解析 EMAIL 常量，供校验落盘路径。 */
export function parseEmailKeyFromMjs(source: string): string | null {
  const m = /const\s+EMAIL\s*=\s*['"]([^'"]+)['"]/m.exec(source);
  return m?.[1] ?? null;
}

/** 粗检 mjs 是否完整（截断时 node 会 SyntaxError）。 */
export function assertMjsComplete(source: string): void {
  const errors: string[] = [];
  if (!source.includes("writeFileSync")) {
    errors.push("缺少 writeFileSync 落盘逻辑");
  }
  if (!source.includes("template.json")) {
    errors.push("缺少 template.json 落盘");
  }
  if (!/console\.log\s*\(\s*[`'"]Wrote/m.test(source)) {
    errors.push("缺少末尾 console.log Wrote");
  }

  let depth = 0;
  for (const ch of source) {
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
  }
  if (depth !== 0) {
    errors.push(`大括号未闭合（depth=${depth}，脚本可能被截断）`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("；"));
  }
}
