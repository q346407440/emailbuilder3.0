/** autofix 安全网：用 TS parser 做纯语法自检，判断字符串改写是否破坏了 mjs 语法。 */

import ts from "typescript";

type WithParseDiagnostics = ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] };

/**
 * 仅做语法（非类型）解析，判断 mjs 源码是否可解析。
 * 用于 autofix 每条规则后的回退判断：输入可解析但输出不可解析时，应回退该次改动。
 */
export function isParseableMjs(source: string): boolean {
  const sourceFile = ts.createSourceFile(
    "autofix-check.mjs",
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    ts.ScriptKind.JS
  ) as WithParseDiagnostics;
  return (sourceFile.parseDiagnostics?.length ?? 0) === 0;
}

/**
 * 应用一次确定性改写：仅当「改写前可解析、改写后不可解析」时回退，避免 autofix 自造 SyntaxError。
 * 改写前本就不可解析（如截断稿）时不回退——交给后续 node/patch 路径。
 */
export function applyRuleWithSyntaxGuard(
  before: string,
  rewrite: (input: string) => { source: string; fixes: string[] }
): { source: string; fixes: string[]; reverted: boolean } {
  const result = rewrite(before);
  if (result.source === before) {
    return { source: before, fixes: result.fixes, reverted: false };
  }
  if (isParseableMjs(before) && !isParseableMjs(result.source)) {
    return { source: before, fixes: [], reverted: true };
  }
  return { source: result.source, fixes: result.fixes, reverted: false };
}
