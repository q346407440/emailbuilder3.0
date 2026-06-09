/** 将 validate 路径中的 blockId 映射到 mjs 源码片段，供 patch 模式定位。 */

export type MjsErrorSnippet = {
  blockId: string;
  errorLine: string;
  snippet: string;
  lineStart: number;
};

import { blockIdFromValidateIssueLine } from "./mjsValidatePath";

/** 从 `blocks.xxx.path: reason` 提取 blockId（含连字符的完整 id）。 */
export function blockIdFromValidateLine(errorLine: string): string | null {
  return blockIdFromValidateIssueLine(errorLine);
}

function findBlockAnchor(source: string, blockId: string): number {
  const literalPatterns = [`id: '${blockId}'`, `id: "${blockId}"`, `id: \`${blockId}\``];
  for (const p of literalPatterns) {
    const idx = source.indexOf(p);
    if (idx >= 0) return idx;
  }

  const firstDash = blockId.indexOf("-");
  if (firstDash > 0) {
    const suffix = blockId.slice(firstDash + 1);
    const templatePatterns = [`id: \`\${P}-${suffix}\``, `id: \`\${P}-${suffix}\`,`];
    for (const p of templatePatterns) {
      const idx = source.indexOf(p);
      if (idx >= 0) return idx;
    }
  }

  const nidCall = `nid('${blockId}')`;
  const idx = source.indexOf(nidCall);
  if (idx >= 0) return idx;
  return -1;
}

function extractHelperFunctionSnippet(source: string, fnName: string): string | null {
  const re = new RegExp(`function\\s+${fnName}\\s*\\([\\s\\S]*?^}`, "m");
  const m = re.exec(source);
  return m?.[0] ?? null;
}

/** 取 mjs 中某 block 锚点前后各 contextLines 行。 */
export function extractMjsSnippet(
  source: string,
  blockId: string,
  contextLines = 18
): { snippet: string; lineStart: number } | null {
  const anchor = findBlockAnchor(source, blockId);
  if (anchor < 0) return null;
  const before = source.slice(0, anchor);
  const lineStart = before.split("\n").length;
  const lines = source.split("\n");
  const start = Math.max(0, lineStart - 1 - contextLines);
  const end = Math.min(lines.length, lineStart + contextLines);
  return {
    snippet: lines.slice(start, end).join("\n"),
    lineStart: start + 1,
  };
}

/** 为 validate 错误列表生成去重后的定位片段（最多 maxSnippets 条）。 */
export function buildMjsErrorSnippets(
  mjsSource: string,
  errorLines: string[],
  maxSnippets = 12
): MjsErrorSnippet[] {
  const seen = new Set<string>();
  const out: MjsErrorSnippet[] = [];

  const borderRadiusErrors = errorLines.filter(
    (line) => /wrapperStyle\.borderRadius/.test(line) || /props\.borderRadius/.test(line)
  );
  if (borderRadiusErrors.length >= 2) {
    for (const fnName of ["rowLayout", "gridBlock", "sectionShell"]) {
      const helper = extractHelperFunctionSnippet(mjsSource, fnName);
      if (helper && !seen.has(`helper:${fnName}`)) {
        seen.add(`helper:${fnName}`);
        out.push({
          blockId: `helper:${fnName}`,
          errorLine: "多处 wrapperStyle.borderRadius / emailRoot.props.borderRadius — 优先改助手函数一处修多处",
          snippet: helper,
          lineStart: 0,
        });
        break;
      }
    }
  }

  for (const errorLine of errorLines) {
    const blockId = blockIdFromValidateLine(errorLine);
    if (!blockId || seen.has(blockId)) continue;
    seen.add(blockId);
    const located = extractMjsSnippet(mjsSource, blockId);
    if (!located) continue;
    out.push({
      blockId,
      errorLine,
      snippet: located.snippet,
      lineStart: located.lineStart,
    });
    if (out.length >= maxSnippets) break;
  }

  return out;
}
