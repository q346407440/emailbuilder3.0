import { useMemo, useState } from "react";
import type { ValidationIssue } from "../lib/validate";

const MATERIALIZED_INTERMEDIATE_REASON =
  /列表项字段.*slotPath|带数字下标的\s*slotPath|collection\s*列表项字段/i;

const VISIBLE_INLINE_MAX = 3;

function issueGroupKey(path: string): string {
  const blocksMatch = path.match(/^blocks\.([^.]+)/);
  if (blocksMatch) return blocksMatch[1]!;
  const prefix = path.split(".")[0];
  return prefix || path;
}

function formatIssueLine(issue: ValidationIssue): string {
  return `${issue.path}：${issue.reason}`;
}

type Props = {
  issues: ValidationIssue[];
  className?: string;
};

/**
 * 顶栏校验条：物化中间态 warning 折叠、长列表可展开、按区块分组展示。
 */
export function ValidationIssuesBanner({ issues, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { materializedWarnings, otherIssues } = useMemo(() => {
    const materialized: ValidationIssue[] = [];
    const other: ValidationIssue[] = [];
    for (const issue of issues) {
      if (issue.level === "warning" && MATERIALIZED_INTERMEDIATE_REASON.test(issue.reason)) {
        materialized.push(issue);
      } else {
        other.push(issue);
      }
    }
    return { materializedWarnings: materialized, otherIssues: other };
  }, [issues]);

  const groupedOther = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of otherIssues) {
      const key = issueGroupKey(issue.path);
      const list = map.get(key) ?? [];
      list.push(issue);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-CN"));
  }, [otherIssues]);

  const flatDisplayLines = useMemo(() => {
    const lines: string[] = [];
    if (materializedWarnings.length > 0) {
      lines.push(
        `主推区等物化中间态（${materializedWarnings.length} 条）：解除后、重绑完成前可能出现；重绑并应用列表绑定后应消失`
      );
    }
    for (const [, groupIssues] of groupedOther) {
      for (const issue of groupIssues) {
        lines.push(formatIssueLine(issue));
      }
    }
    return lines;
  }, [materializedWarnings.length, groupedOther]);

  const visibleLines = expanded ? flatDisplayLines : flatDisplayLines.slice(0, VISIBLE_INLINE_MAX);
  const hiddenCount = flatDisplayLines.length - visibleLines.length;

  if (issues.length === 0) return null;

  return (
    <div className={`app__banner app__banner--warn validation-issues-banner ${className}`.trim()}>
      <div className="validation-issues-banner__head">
        <strong className="validation-issues-banner__title">校验提示</strong>
        {flatDisplayLines.length > VISIBLE_INLINE_MAX ? (
          <button
            type="button"
            className="validation-issues-banner__toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "收起" : `展开全部（${flatDisplayLines.length}）`}
          </button>
        ) : null}
      </div>
      <ul className="validation-issues-banner__list">
        {visibleLines.map((line, index) => (
          <li key={`${index}-${line.slice(0, 48)}`} className="validation-issues-banner__item" title={line}>
            {line}
          </li>
        ))}
        {!expanded && hiddenCount > 0 ? (
          <li className="validation-issues-banner__item validation-issues-banner__item--more">
            …另有 {hiddenCount} 条
          </li>
        ) : null}
      </ul>
      {expanded && materializedWarnings.length > 0 ? (
        <details className="validation-issues-banner__materialized-details">
          <summary>物化中间态明细（{materializedWarnings.length}）</summary>
          <ul className="validation-issues-banner__list">
            {materializedWarnings.map((issue, index) => (
              <li
                key={`mat-${index}`}
                className="validation-issues-banner__item"
                title={formatIssueLine(issue)}
              >
                {formatIssueLine(issue)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
