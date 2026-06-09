/** validate 前后的确定性 mjs 修补（不调 LLM）。 */

import { blockIdFromValidateIssueLine } from "./mjsValidatePath";
import { applyRuleWithSyntaxGuard } from "./mjsSyntaxGuard";

type ContentAlignAxis = "left" | "center" | "right" | "top" | "bottom";

const FLEX_ALIGN_TO_HORIZONTAL: Record<string, ContentAlignAxis> = {
  start: "left",
  center: "center",
  end: "right",
  stretch: "left",
  "space-between": "left",
};

const FLEX_ALIGN_TO_VERTICAL: Record<string, ContentAlignAxis> = {
  start: "top",
  center: "center",
  end: "bottom",
  stretch: "top",
  "space-between": "top",
};

const FORBIDDEN_LINE_RES: Array<{ re: RegExp; label: string }> = [
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

/** 只在 validate 明确报 buttonStyle.padding 时删除按钮样式内 padding，避免误删合法 wrapperStyle.padding。 */
function stripButtonStylePadding(source: string, errorLines: string[]): { source: string; fixes: string[] } {
  if (!errorLines.some((line) => /buttonStyle\.padding/.test(line))) {
    return { source, fixes: [] };
  }

  const fixes: string[] = [];
  const lines = source.split("\n");
  const kept: string[] = [];
  let inButtonStyle = false;
  let depth = 0;

  for (const line of lines) {
    if (/buttonStyle\s*:\s*\{/.test(line)) {
      inButtonStyle = true;
      depth = 0;
    }

    const shouldDrop =
      inButtonStyle && /^\s*padding:\s*(\{[^}]*\}|['"][^'"]*['"])\s*,?\s*$/.test(line);
    if (shouldDrop) {
      if (!fixes.includes("删除 buttonStyle.padding")) fixes.push("删除 buttonStyle.padding");
    } else {
      kept.push(line);
    }

    if (inButtonStyle) {
      depth += (line.match(/\{/g) ?? []).length;
      depth -= (line.match(/\}/g) ?? []).length;
      if (depth <= 0) {
        inButtonStyle = false;
      }
    }
  }

  return { source: kept.join("\n"), fixes };
}

/** 将废弃 flex 对齐字段映射为 wrapperStyle.contentAlign，再删除 props 内 mainAlign/crossAlign。 */
function mapLegacyFlexAlignToContentAlign(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = source;

  const blockRe =
    /props:\s*\{([^}]*(?:mainAlign|crossAlign)[^}]*)\}([\s\S]{0,800}?wrapperStyle:\s*\{)/g;

  out = out.replace(blockRe, (full, propsBody: string, prefix: string) => {
    const direction = /direction:\s*'([^']*)'/.exec(propsBody)?.[1] ?? "vertical";
    const mainAlign = /mainAlign:\s*'([^']*)'/.exec(propsBody)?.[1];
    const crossAlign = /crossAlign:\s*'([^']*)'/.exec(propsBody)?.[1];

    let horizontal: ContentAlignAxis = "left";
    let vertical: ContentAlignAxis = "top";
    if (direction === "horizontal") {
      horizontal = FLEX_ALIGN_TO_HORIZONTAL[mainAlign ?? ""] ?? "left";
      vertical = FLEX_ALIGN_TO_VERTICAL[crossAlign ?? ""] ?? "top";
    } else {
      vertical = FLEX_ALIGN_TO_VERTICAL[mainAlign ?? ""] ?? "top";
      horizontal = FLEX_ALIGN_TO_HORIZONTAL[crossAlign ?? ""] ?? "left";
    }

    const cleanedProps = propsBody
      .replace(/,?\s*mainAlign:\s*'[^']*'/g, "")
      .replace(/,?\s*crossAlign:\s*'[^']*'/g, "")
      .replace(/,?\s*justify:\s*'[^']*'/g, "");

    let newPrefix = prefix;
    if (!/contentAlign\s*:/.test(prefix)) {
      const indentMatch = /\n(\s*)wrapperStyle:\s*\{/.exec(prefix);
      const indent = indentMatch ? `${indentMatch[1]}  ` : "      ";
      const contentAlignLine = `${indent}contentAlign: { horizontal: '${horizontal}', vertical: '${vertical}' },\n`;
      newPrefix = prefix.replace(/(wrapperStyle:\s*\{)(\s*\n)?/, `$1\n${contentAlignLine}`);
      if (!fixes.includes("mainAlign/crossAlign→contentAlign")) {
        fixes.push("mainAlign/crossAlign→contentAlign");
      }
    } else if (!fixes.includes("删除 legacy mainAlign/crossAlign")) {
      fixes.push("删除 legacy mainAlign/crossAlign");
    }

    return `props: {${cleanedProps}}${newPrefix}`;
  });

  const inline = stripInlineForbiddenProps(out);
  allFixesPushUnique(fixes, inline.fixes);
  return { source: inline.source, fixes };
}

function allFixesPushUnique(target: string[], next: string[]): void {
  for (const f of next) {
    if (!target.includes(f)) target.push(f);
  }
}

/** 删除同一行 props 对象内的 mainAlign / crossAlign / justify（无映射上下文时的兜底）。 */
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

/** 当前行是否位于 emailRoot.props 内（此处禁止 borderRadius）。 */
function isInEmailRootProps(lines: string[], lineIndex: number): boolean {
  const before = lines.slice(0, lineIndex + 1).join("\n");
  const rootTypeIdx = before.lastIndexOf("type: 'emailRoot'");
  if (rootTypeIdx < 0) return false;
  const afterRoot = before.slice(rootTypeIdx);
  const propsIdx = afterRoot.indexOf("props:");
  if (propsIdx < 0) return false;
  const afterProps = before.slice(rootTypeIdx + propsIdx);
  return !/wrapperStyle:/.test(afterProps);
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
    // 单行对象赋值无法安全插入新字段；交给 LLM patch 或后续校验路径修复。
    if (/\{.*backgroundColor:.*\}/.test(line)) continue;

    const inEmailRootProps = isInEmailRootProps(lines, i);
    const indent = line.match(/^(\s*)/)?.[1] ?? "      ";
    const window = lines.slice(i, Math.min(lines.length, i + 20)).join("\n");
    if (!/\bborder\s*:/.test(window)) {
      out.push(`${indent}border: borderNone(),`);
      if (!fixes.includes("缺失 border → borderNone()")) fixes.push("缺失 border → borderNone()");
    }
    // emailRoot.props 白名单禁止 borderRadius，勿补
    if (!inEmailRootProps && !/borderRadius\s*:/.test(window)) {
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

  const anchor2 = findBlockIdAnchor(source, blockId);
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

const WRAPPER_STYLE_BORDER_RADIUS =
  "borderRadius: { mode: 'unified', radius: '0' },";

/** ICON 槽 id 含连字符时禁止 ICON.icon-xxx 点号访问（会被 JS 当成减法）。 */
function fixIconHyphenatedBracketAccess(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = source;
  const re = /ICON\.(icon-[a-z0-9-]+)/g;
  if (!re.test(source)) return { source, fixes };
  out = source.replace(/ICON\.(icon-[a-z0-9-]+)/g, 'ICON["$1"]');
  fixes.push('ICON.icon-* → ICON["icon-*"]');
  return { source: out, fixes };
}

function ensureWrapperStyleBorderRadiusAtPath(
  source: string,
  errorLine: string
): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  if (!/borderRadius/.test(errorLine) || !/wrapperStyle/.test(errorLine)) {
    return { source, fixes };
  }

  const blockId = blockIdFromErrorLine(errorLine);
  if (!blockId) return { source, fixes };

  const anchor2 = findBlockIdAnchor(source, blockId);
  if (anchor2 < 0) return { source, fixes };

  const region = source.slice(anchor2, anchor2 + 4000);
  const wsIdx = region.indexOf("wrapperStyle:");
  if (wsIdx < 0) return { source, fixes };

  const wsRegion = region.slice(wsIdx, Math.min(region.length, wsIdx + 900));
  if (/borderRadius\s*:/.test(wsRegion)) return { source, fixes };

  const absWs = anchor2 + wsIdx;
  const brace = source.indexOf("{", absWs);
  if (brace < 0) return { source, fixes };

  const afterOpen = source.slice(brace + 1);
  const indent = (afterOpen.match(/^\s*\n(\s*)/)?.[1] ?? "      ");
  const insert = `\n${indent}${WRAPPER_STYLE_BORDER_RADIUS}`;
  const patched = `${source.slice(0, brace + 1)}${insert}${source.slice(brace + 1)}`;
  fixes.push(`${blockId} 补 wrapperStyle.borderRadius`);
  return { source: patched, fixes };
}

function ensureTextProps(source: string, blockId: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  const anchor2 = findBlockIdAnchor(source, blockId);
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
  const anchor = findBlockIdAnchor(source, blockId);
  if (anchor < 0) return { source, fixes: [] };

  const region = source.slice(anchor, anchor + 800);
  let patchedRegion = region;
  const fixes: string[] = [];

  if (/widthMode:\s*'fill'/.test(patchedRegion)) {
    patchedRegion = patchedRegion.replace(/widthMode:\s*'fill'/, "widthMode: 'hug'");
    fixes.push(`${blockId} widthMode fill→hug`);
  }
  if (/heightMode:\s*'fill'/.test(patchedRegion)) {
    patchedRegion = patchedRegion.replace(/heightMode:\s*'fill'/, "heightMode: 'hug'");
    fixes.push(`${blockId} heightMode fill→hug`);
  }

  if (fixes.length === 0) return { source, fixes: [] };

  const patched = source.slice(0, anchor) + patchedRegion + source.slice(anchor + 800);
  return { source: patched, fixes };
}

/** 所有 text 块缺 italic/decoration 时补默认值（validate 要求必填）。 */
function ensureAllTextProps(source: string): { source: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = source;
  const typeRe = /type:\s*'text'/g;
  const hits: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = typeRe.exec(out)) !== null) {
    hits.push(m.index);
  }

  for (let hi = hits.length - 1; hi >= 0; hi -= 1) {
    const typeIdx = hits[hi]!;
    const chunk = out.slice(typeIdx, typeIdx + 2200);
    const propsRel = chunk.indexOf("props:");
    if (propsRel < 0) continue;
    const propsRegion = chunk.slice(propsRel, propsRel + 1200);
    if (/italic\s*:/.test(propsRegion) && /decoration\s*:/.test(propsRegion)) continue;

    const absProps = typeIdx + propsRel;
    const afterProps = out.slice(absProps, absProps + 1200);
    const insertAfter = afterProps.search(/\b(color|bold|fontSize|textBody)\s*:/);
    if (insertAfter < 0) continue;

    const lineEnd = afterProps.indexOf("\n", insertAfter);
    const insertPos = absProps + (lineEnd >= 0 ? lineEnd : insertAfter);
    const indent = (out.slice(insertPos).match(/^\s*/)?.[0] ?? "        ") + "  ";
    const additions: string[] = [];
    if (!/italic\s*:/.test(propsRegion)) additions.push(`${indent}italic: false,`);
    if (!/decoration\s*:/.test(propsRegion)) additions.push(`${indent}decoration: 'none',`);
    if (additions.length === 0) continue;

    out = `${out.slice(0, insertPos + 1)}${additions.join("\n")}\n${out.slice(insertPos + 1)}`;
    if (!fixes.includes("text 补 italic/decoration")) fixes.push("text 补 italic/decoration");
  }

  return { source: out, fixes };
}

function blockIdFromErrorLine(line: string): string | null {
  return blockIdFromValidateIssueLine(line);
}

/** mjs 源码中 block id 多为 \`\${P}-s2-left\`，validate 路径为 couponte-s2-left。 */
function findBlockIdAnchor(source: string, blockId: string): number {
  const literalPatterns = [`id: '${blockId}'`, `id: "${blockId}"`];
  for (const p of literalPatterns) {
    const idx = source.indexOf(p);
    if (idx >= 0) return idx;
  }

  const firstDash = blockId.indexOf("-");
  if (firstDash > 0) {
    const suffix = blockId.slice(firstDash + 1);
    const templatePatterns = [
      `id: \`\${P}-${suffix}\``,
      `id: \`\${P}-${suffix}\`,`,
    ];
    for (const p of templatePatterns) {
      const idx = source.indexOf(p);
      if (idx >= 0) return idx;
    }
  }

  return -1;
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

/** 根据 validate 错误对 mjs 做确定性修补（errorLines 为空时仅跑 proactive 规则）。 */
export function applyMjsAutofix(source: string, errorLines: string[]): MjsAutofixResult {
  let current = source;
  const allFixes: string[] = [];
  let revertedCount = 0;

  /** 应用一条规则；若改写破坏了 mjs 语法则回退该次改动（语法安全网）。 */
  const run = (rewrite: (input: string) => { source: string; fixes: string[] }): void => {
    const r = applyRuleWithSyntaxGuard(current, rewrite);
    current = r.source;
    allFixesPushUnique(allFixes, r.fixes);
    if (r.reverted) revertedCount += 1;
  };

  run(mapLegacyFlexAlignToContentAlign);

  // 删除废弃 flex 字段整行（映射后兜底）
  run(stripForbiddenLines);
  run((s) => stripButtonStylePadding(s, errorLines));
  run(stripInlineForbiddenProps);

  run(fixIconHyphenatedBracketAccess);
  run(ensureEmailRootPadding);
  run(ensureAllTextProps);
  run(fixInvalidBorderObjects);

  for (const line of errorLines) {
    if (/wrapperStyle\.border/.test(line)) {
      run(injectBorderOnBackground);
    }
    if (/borderRadius/.test(line) && /wrapperStyle/.test(line)) {
      run((s) => ensureWrapperStyleBorderRadiusAtPath(s, line));
    }
    if (/padding/.test(line) && /必须显式配置 padding/.test(line)) {
      run((s) => ensurePaddingZeroAtPath(s, line));
    }
    if (/italic|decoration/.test(line)) {
      const id = blockIdFromErrorLine(line);
      if (id) run((s) => ensureTextProps(s, id));
    }
    if (/hug/.test(line) && /fill/.test(line)) {
      const id = blockIdFromErrorLine(line);
      if (id) run((s) => fixHugFillForBlock(s, id));
    }
    if (/wrapperStyle\.widthMode/.test(line) && /fill/.test(line)) {
      const id = blockIdFromErrorLine(line);
      if (id) run((s) => fixHugFillForBlock(s, id));
    }
    if (/wrapperStyle\.heightMode/.test(line) && /fill/.test(line)) {
      const id = blockIdFromErrorLine(line);
      if (id) run((s) => fixHugFillForBlock(s, id));
    }
    if (/button/.test(line) && /wrapperStyle\.heightMode/.test(line)) {
      run(enforceButtonWrapperHeightHug);
    }
  }

  run(stripEmailRootPropsBorderRadius);

  if (revertedCount > 0) {
    allFixes.push(`autofix 跳过 ${revertedCount} 条改动（语法保护）`);
  }

  const uniqueFixes = [...new Set(allFixes)];
  return {
    source: current,
    changed: current !== source,
    fixes: uniqueFixes,
  };
}
