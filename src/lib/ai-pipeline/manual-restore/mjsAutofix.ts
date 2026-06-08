/** validate 失败后的确定性 mjs 修补（不调 LLM）。 */

const FORBIDDEN_LINE_RES: Array<{ re: RegExp; label: string }> = [
  { re: /^\s*padding:\s*(\{[^}]*\}|['"][^'"]*['"])\s*,?\s*$/, label: "删除 buttonStyle.padding" },
  { re: /^\s*margin:\s*\{/, label: "删除 wrapperStyle.margin" },
  { re: /^\s*marginTop:\s*/, label: "删除 marginTop" },
  { re: /^\s*marginBottom:\s*/, label: "删除 marginBottom" },
  { re: /^\s*marginLeft:\s*/, label: "删除 marginLeft" },
  { re: /^\s*marginRight:\s*/, label: "删除 marginRight" },
  { re: /^\s*crossAlign:\s*/, label: "删除 crossAlign" },
  { re: /^\s*mainAlign:\s*/, label: "删除 mainAlign" },
  { re: /^\s*justify:\s*/, label: "删除 justify" },
  { re: /^\s*borderBottom:\s*/, label: "删除 borderBottom" },
];

const ZERO_PADDING_UNIFIED = "{ mode: 'unified', unified: '0' }";
const ZERO_PADDING_SEPARATE =
  "{ mode: 'separate', top: '0', right: '0', bottom: '0', left: '0' }";

function stripForbiddenLines(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const lines = source.split("\n");
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let skip = false;
    for (const { re, label } of FORBIDDEN_LINE_RES) {
      if (re.test(line)) {
        if (!fixes.includes(label)) fixes.push(label);
        skip = true;
        if (/margin:\s*\{/.test(line)) {
          while (i + 1 < lines.length && !/^\s*\},?\s*$/.test(lines[i + 1]!)) i += 1;
          if (i + 1 < lines.length) i += 1;
        }
        break;
      }
    }
    if (!skip) kept.push(line);
  }

  return { source: kept.join("\n"), fixes };
}

/** 删除同一行 props 对象内的 mainAlign / crossAlign / justify。 */
function stripInlineForbiddenProps(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = source;
  const inline: Array<{ re: RegExp; label: string }> = [
    { re: /,?\s*mainAlign:\s*'[^']*'/g, label: "删除 inline mainAlign" },
    { re: /,?\s*crossAlign:\s*'[^']*'/g, label: "删除 inline crossAlign" },
    { re: /,?\s*justify:\s*'[^']*'/g, label: "删除 inline justify" },
  ];
  for (const { re, label } of inline) {
    if (re.test(out)) {
      out = out.replace(re, "");
      if (!fixes.includes(label)) fixes.push(label);
    }
  }
  out = out.replace(/\{\s*,/g, "{");
  out = out.replace(/,\s*,/g, ",");
  return { source: out, fixes };
}

/** 在含 backgroundColor 的对象中，缺失 border 时补 borderNone()（不覆盖豆包已写的合法 border）。 */
function injectBorderOnBackground(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const lines = source.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    out.push(line);
    if (!/backgroundColor:/.test(line)) continue;

    const indent = line.match(/^(\s*)/)?.[1] ?? "      ";
    const window = lines.slice(i, Math.min(lines.length, i + 20)).join("\n");
    if (!/\bborder\s*:/.test(window)) {
      out.push(`${indent}border: borderNone(),`);
      if (!fixes.includes("缺失 border → borderNone()")) fixes.push("缺失 border → borderNone()");
    }
    if (!/borderRadius\s*:/.test(window)) {
      out.push(`${indent}borderRadius: { mode: 'unified', radius: '0' },`);
      if (!fixes.includes("补 borderRadius")) fixes.push("补 borderRadius");
    }
  }

  return { source: out.join("\n"), fixes };
}

/** 非法 border → 尽量规范化；无法解析 → borderNone()。已有 mode: 'unified'|'custom' 的原样保留。 */
function fixInvalidBorderObjects(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = source;

  // 仅处理对象体内**不含** mode 字段的 border
  const borderWithoutModeRe = /border:\s*\{(?![^}]*\bmode\s*:)[^}]*\}/g;

  // padding 的 separate 误写到 border → custom
  out = out.replace(
    /border:\s*\{\s*mode:\s*'separate',[^}]*\}/g,
    (block) => {
      const top = /top:\s*'([^']*)'/.exec(block)?.[1] ?? "0";
      const right = /right:\s*'([^']*)'/.exec(block)?.[1] ?? "0";
      const bottom = /bottom:\s*'([^']*)'/.exec(block)?.[1] ?? "0";
      const left = /left:\s*'([^']*)'/.exec(block)?.[1] ?? "0";
      const style = /style:\s*'([^']*)'/.exec(block)?.[1] ?? "solid";
      const color = /color:\s*([^,}]+)/.exec(block)?.[1]?.trim() ?? "COLORS.primary";
      if (!fixes.includes("border separate→custom")) fixes.push("border separate→custom");
      return `border: { mode: 'custom', style: '${style}', color: ${color}, top: { width: '${top}' }, right: { width: '${right}' }, bottom: { width: '${bottom}' }, left: { width: '${left}' } }`;
    }
  );

  // 缺 mode 但含 width/style/color → unified
  out = out.replace(borderWithoutModeRe, (block) => {
    const width = /\bwidth:\s*'([^']*)'/.exec(block)?.[1];
    const style = /\bstyle:\s*'([^']*)'/.exec(block)?.[1];
    const color = /\bcolor:\s*([^,}]+)/.exec(block)?.[1]?.trim();
    if (width && style && color) {
      if (!fixes.includes("border 缺 mode→unified")) fixes.push("border 缺 mode→unified");
      return `border: { mode: 'unified', width: '${width}', style: '${style}', color: ${color} }`;
    }
    if (!fixes.includes("无法解析 border→borderNone()")) fixes.push("无法解析 border→borderNone()");
    return "border: borderNone()";
  });

  return { source: out, fixes };
}

/** emailRoot props 禁止 borderRadius → 删除该字段。 */
function stripEmailRootPropsBorderRadius(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const rootRe =
    /(type:\s*'emailRoot'[\s\S]*?props:\s*\{)([\s\S]*?)(\n\s*\},?\n\s*wrapperStyle:)/m;
  const m = rootRe.exec(source);
  if (!m) return { source, fixes };

  const propsBody = m[2]!;
  if (!/borderRadius/.test(propsBody)) return { source, fixes };

  const cleaned = propsBody.replace(/\n\s*borderRadius:\s*\{[\s\S]*?\},?\n?/g, "\n");
  fixes.push("删除 emailRoot.props.borderRadius");
  return { source: source.replace(m[0], `${m[1]}${cleaned}${m[3]}`), fixes };
}

/** emailRoot props 缺 padding → unified 0。 */
function ensureEmailRootPadding(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const rootRe =
    /(type:\s*'emailRoot'[\s\S]*?props:\s*\{)([\s\S]*?)(\n\s*\},?\n\s*wrapperStyle:)/m;
  const m = rootRe.exec(source);
  if (!m) return { source, fixes };

  const propsBody = m[2]!;
  if (/padding\s*:/.test(propsBody)) return { source, fixes };

  const insert = `\n      padding: ${ZERO_PADDING_UNIFIED},`;
  const patched = source.replace(m[0], `${m[1]}${insert}${propsBody}${m[3]}`);
  fixes.push("补 emailRoot.props.padding=0");
  return { source: patched, fixes };
}

/** wrapperStyle / props 缺 padding 且 validate 报错时 → separate 0（保守：仅 emailRoot 自动，其余按错误路径）。 */
function ensurePaddingZeroAtPath(
  source: string,
  errorLine: string
): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  if (!/padding/.test(errorLine)) return { source, fixes };

  const blockId = blockIdFromErrorLine(errorLine);
  if (!blockId) return { source, fixes };

  const anchor = source.indexOf(`id: '${blockId}'`);
  const anchor2 = anchor < 0 ? source.indexOf(`id: "${blockId}"`) : anchor;
  if (anchor2 < 0) return { source, fixes };

  const region = source.slice(anchor2, anchor2 + 3500);
  if (/padding\s*:/.test(region)) return { source, fixes };

  // 在 wrapperStyle: { 后插入
  const wsIdx = region.indexOf("wrapperStyle:");
  const propsIdx = region.indexOf("props:");
  const targetIdx = wsIdx >= 0 ? wsIdx : propsIdx;
  if (targetIdx < 0) return { source, fixes };

  const abs = anchor2 + targetIdx;
  const brace = source.indexOf("{", abs);
  if (brace < 0) return { source, fixes };

  const line = source.slice(brace).split("\n")[0] ?? "";
  const indent = (line.match(/^(\s*)/)?.[1] ?? "      ") + "  ";
  const insert = `\n${indent}padding: ${ZERO_PADDING_SEPARATE},`;
  const patched = `${source.slice(0, brace + 1)}${insert}${source.slice(brace + 1)}`;
  fixes.push(`${blockId} 补 padding=0`);
  return { source: patched, fixes };
}

/** type:image 且缺 backgroundImage → 补占位底图（仅 buildS* 段落，跳过脚手架助手）。 */
function ensureImageBackgroundImage(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const buildStart = source.search(/function\s+buildS\d+\s*\(/);
  if (buildStart < 0) return { source, fixes };

  let out = source;
  const region = source.slice(buildStart);
  const typeRe = /type:\s*'image'/g;
  const hits: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = typeRe.exec(region)) !== null) {
    hits.push(buildStart + m.index);
  }

  for (let hi = hits.length - 1; hi >= 0; hi -= 1) {
    const typeIdx = hits[hi]!;
    const chunkStart = Math.max(0, typeIdx - 120);
    const chunk = out.slice(chunkStart, typeIdx + 2200);
    if (/backgroundImage\s*:/.test(chunk)) continue;

    const wsRel = chunk.indexOf("wrapperStyle:");
    if (wsRel < 0) continue;
    const absWs = chunkStart + wsRel;
    const brace = out.indexOf("{", absWs);
    if (brace < 0) continue;

    const indent = (out.slice(brace).match(/^\s*/)?.[0] ?? "      ") + "  ";
    const block = `\n${indent}backgroundImage: {
${indent}  src: '#',
${indent}  alt: '',
${indent}  fit: 'contain',
${indent}  position: 'center',
${indent}  border: borderNone(),
${indent}  borderRadius: { mode: 'unified', radius: '0' },
${indent}},`;
    out = `${out.slice(0, brace + 1)}${block}${out.slice(brace + 1)}`;
    fixes.push("image 补 backgroundImage");
  }

  return { source: out, fixes: [...new Set(fixes)] };
}

function ensureTextProps(source: string, blockId: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const anchor = source.indexOf(`id: '${blockId}'`);
  const anchor2 = anchor < 0 ? source.indexOf(`id: "${blockId}"`) : anchor;
  if (anchor2 < 0) return { source, fixes };

  const tail = source.slice(anchor2, anchor2 + 2500);
  const propsStart = tail.indexOf("props:");
  if (propsStart < 0) return { source, fixes };

  const propsRegion = tail.slice(propsStart, propsStart + 1200);
  if (/italic\s*:/.test(propsRegion) && /decoration\s*:/.test(propsRegion)) {
    return { source, fixes };
  }

  let patched = source;
  const absProps = anchor2 + propsStart;
  const afterProps = patched.slice(absProps, absProps + 1200);
  const insertAfter = afterProps.search(/\b(color|bold|fontSize)\s*:/);
  if (insertAfter < 0) return { source, fixes };

  const lineEnd = afterProps.indexOf("\n", insertAfter);
  const insertPos = absProps + (lineEnd >= 0 ? lineEnd : insertAfter);
  const line = patched.slice(insertPos).split("\n")[0] ?? "";
  const indent = (line.match(/^(\s*)/)?.[1] ?? "        ") + "  ";

  const additions: string[] = [];
  if (!/italic\s*:/.test(propsRegion)) {
    additions.push(`${indent}italic: false,`);
    fixes.push(`${blockId} 补 italic`);
  }
  if (!/decoration\s*:/.test(propsRegion)) {
    additions.push(`${indent}decoration: 'none',`);
    fixes.push(`${blockId} 补 decoration`);
  }
  if (additions.length === 0) return { source, fixes };

  patched = `${patched.slice(0, insertPos + 1)}${additions.join("\n")}\n${patched.slice(insertPos + 1)}`;
  return { source: patched, fixes };
}

function fixHugFillForBlock(source: string, blockId: string): { source: string; fixes: string[] } {
  const anchor = source.indexOf(`id: '${blockId}'`);
  if (anchor < 0) return { source, fixes: [] };

  const region = source.slice(anchor, anchor + 800);
  const fillRe = /widthMode:\s*'fill'/;
  if (!fillRe.test(region)) return { source, fixes: [] };

  const patched =
    source.slice(0, anchor) +
    region.replace(fillRe, "widthMode: 'hug'") +
    source.slice(anchor + 800);
  return { source: patched, fixes: [`${blockId} widthMode fill→hug`] };
}

function blockIdFromErrorLine(line: string): string | null {
  const path = line.split(":")[0]?.trim() ?? "";
  const m = /^blocks\.([^.]+)/.exec(path);
  return m?.[1] ?? null;
}

/** button 外层 wrapperStyle 高度必须 hug，避免定高裁切胶囊文案。 */
function enforceButtonWrapperHeightHug(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = source;
  const typeRe = /type:\s*'button'/g;
  const hits: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = typeRe.exec(out)) !== null) {
    hits.push(m.index);
  }

  for (let hi = hits.length - 1; hi >= 0; hi -= 1) {
    const typeIdx = hits[hi]!;
    const chunkStart = Math.max(0, typeIdx - 200);
    const chunk = out.slice(chunkStart, typeIdx + 2800);
    const wsRel = chunk.indexOf("wrapperStyle:");
    if (wsRel < 0) continue;

    const wsStart = chunkStart + wsRel;
    const regionLen = Math.min(1200, out.length - wsStart);
    const region = out.slice(wsStart, wsStart + regionLen);
    let newRegion = region;
    let changed = false;

    if (/heightMode:\s*'fixed'/.test(newRegion)) {
      newRegion = newRegion.replace(/heightMode:\s*'fixed'/, "heightMode: 'hug'");
      changed = true;
    }
    if (/heightMode:\s*'fill'/.test(newRegion)) {
      newRegion = newRegion.replace(/heightMode:\s*'fill'/, "heightMode: 'hug'");
      changed = true;
    }
    if (/heightMode:\s*'hug'/.test(newRegion) || changed) {
      const withoutHeight = newRegion.replace(/\n\s*height:\s*'[^']*',?\s*/g, "\n");
      if (withoutHeight !== newRegion) {
        newRegion = withoutHeight;
        changed = true;
      }
    }

    if (changed) {
      out = `${out.slice(0, wsStart)}${newRegion}${out.slice(wsStart + region.length)}`;
      if (!fixes.includes("button wrapperStyle.heightMode→hug")) {
        fixes.push("button wrapperStyle.heightMode→hug");
      }
    }
  }

  return { source: out, fixes };
}

export type MjsAutofixResult = {
  source: string;
  changed: boolean;
  fixes: string[];
};

/** 根据 validate 错误对 mjs 做确定性修补。 */
export function applyMjsAutofix(source: string, errorLines: string[]): MjsAutofixResult {
  let current = source;
  const allFixes: string[] = [];

  const reasons = errorLines.join("\n");

  // 始终删除废弃 flex 字段（整行 + 同行 inline）
  {
    const r = stripForbiddenLines(current);
    current = r.source;
    allFixes.push(...r.fixes);
    const inline = stripInlineForbiddenProps(current);
    current = inline.source;
    allFixes.push(...inline.fixes);
  }

  {
    const r = stripEmailRootPropsBorderRadius(current);
    current = r.source;
    allFixes.push(...r.fixes);
  }

  {
    const r = ensureEmailRootPadding(current);
    current = r.source;
    allFixes.push(...r.fixes);
  }

  {
    const r = ensureImageBackgroundImage(current);
    current = r.source;
    allFixes.push(...r.fixes);
  }

  {
    const r = enforceButtonWrapperHeightHug(current);
    current = r.source;
    allFixes.push(...r.fixes);
  }

  {
    const b = fixInvalidBorderObjects(current);
    current = b.source;
    allFixes.push(...b.fixes);
  }

  if (/borderRadius|描边|border/.test(reasons)) {
    const r = injectBorderOnBackground(current);
    current = r.source;
    allFixes.push(...r.fixes);
  }

  for (const line of errorLines) {
    if (/padding/.test(line) && /必须显式配置 padding/.test(line)) {
      const r = ensurePaddingZeroAtPath(current, line);
      current = r.source;
      allFixes.push(...r.fixes);
    }
    if (/italic|decoration/.test(line)) {
      const id = blockIdFromErrorLine(line);
      if (id) {
        const r = ensureTextProps(current, id);
        current = r.source;
        allFixes.push(...r.fixes);
      }
    }
    if (/hug/.test(line) && /fill/.test(line)) {
      const id = blockIdFromErrorLine(line);
      if (id) {
        const r = fixHugFillForBlock(current, id);
        current = r.source;
        allFixes.push(...r.fixes);
      }
    }
  }

  const uniqueFixes = [...new Set(allFixes)];
  return {
    source: current,
    changed: current !== source,
    fixes: uniqueFixes,
  };
}
