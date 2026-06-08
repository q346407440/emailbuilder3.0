/** 将 validate 路径中的 blockId 映射到 mjs 源码片段，供 patch 模式定位。 */

export type MjsErrorSnippet = {
  blockId: string;
  errorLine: string;
  snippet: string;
  lineStart: number;
};

const BLOCK_ID_FROM_PATH_RE = /^blocks\.([^.]+)/;

/** 从 `blocks.xxx.path: reason` 提取 blockId。 */
export function blockIdFromValidateLine(errorLine: string): string | null {
  const path = errorLine.split(":")[0]?.trim() ?? "";
  const m = BLOCK_ID_FROM_PATH_RE.exec(path);
  return m?.[1] ?? null;
}

function findBlockAnchor(source: string, blockId: string): number {
  const patterns = [
    `id: '${blockId}'`,
    `id: "${blockId}"`,
    `id: \`${blockId}\``,
    `\${id}`, // 动态 id 无法精确匹配
  ];
  for (const p of patterns) {
    const idx = source.indexOf(p);
    if (idx >= 0) return idx;
  }
  // nid('suffix') 形式：用 blockId 末段匹配
  const suffix = blockId.includes("-") ? blockId.split("-").slice(-2).join("-") : blockId;
  const nidCall = `nid('${suffix}')`;
  const idx = source.indexOf(nidCall);
  if (idx >= 0) return idx;
  return -1;
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
  maxSnippets = 8
): MjsErrorSnippet[] {
  const seen = new Set<string>();
  const out: MjsErrorSnippet[] = [];

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
