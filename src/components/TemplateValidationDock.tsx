import { useMemo, useState } from "react";
import type { EmailTemplate } from "../types/email";
import type { ValidationIssue } from "../lib/validate";
import {
  buildDockIssueEntries,
  countValidationIssueSeverity,
  type ClassifiedValidationIssue,
} from "../lib/validationIssueRouting";
import {
  formatValidationIssueForDisplay,
  validationDockCollapsedLabel,
} from "../lib/validationIssueDisplay";

export type ValidationIssueNavigateTarget = ClassifiedValidationIssue;

type Props = {
  issues: ValidationIssue[];
  template: EmailTemplate | null;
  onNavigateIssue?: (target: ValidationIssueNavigateTarget) => void;
  className?: string;
};

export function TemplateValidationDock({
  issues,
  template,
  onNavigateIssue,
  className = "",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const entries = useMemo(
    () => buildDockIssueEntries(issues, (issue) => formatValidationIssueForDisplay(issue, template)),
    [issues, template]
  );

  const { blocking, warning } = useMemo(() => countValidationIssueSeverity(issues), [issues]);

  if (issues.length === 0) return null;

  const collapsedLabel = validationDockCollapsedLabel(blocking, warning);
  const toneClass =
    blocking > 0 ? "template-validation-dock--blocking" : "template-validation-dock--warn";

  return (
    <div
      className={`template-validation-dock ${toneClass} ${className}`.trim()}
      role={blocking > 0 ? "alert" : "status"}
      aria-label="模板检查"
    >
      {!expanded ? (
        <button
          type="button"
          className="template-validation-dock__pill"
          onClick={() => setExpanded(true)}
        >
          <span className="template-validation-dock__pill-title">模板检查</span>
          <span className="template-validation-dock__pill-count">{collapsedLabel}</span>
        </button>
      ) : (
        <div className="template-validation-dock__panel">
          <div className="template-validation-dock__head">
            <strong className="template-validation-dock__title">模板检查</strong>
            {blocking > 0 ? (
              <span className="template-validation-dock__hint">修复前无法保存区块或写入变量</span>
            ) : null}
            <button
              type="button"
              className="template-validation-dock__close"
              onClick={() => setExpanded(false)}
              aria-label="收起"
            >
              收起
            </button>
          </div>
          <ul className="template-validation-dock__list">
            {entries.map((entry) => (
              <li key={entry.key} className="template-validation-dock__item">
                {onNavigateIssue && !entry.isMaterializedGroup ? (
                  <button
                    type="button"
                    className="template-validation-dock__link"
                    title={entry.detail}
                    onClick={() => onNavigateIssue(entry.classified)}
                  >
                    {entry.blocking ? (
                      <span className="template-validation-dock__dot template-validation-dock__dot--error" />
                    ) : (
                      <span className="template-validation-dock__dot template-validation-dock__dot--warn" />
                    )}
                    {entry.summary}
                  </button>
                ) : (
                  <span className="template-validation-dock__text" title={entry.detail}>
                    {entry.summary}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {entries.some((e) => e.detail) ? (
            <button
              type="button"
              className="template-validation-dock__tech-toggle"
              onClick={() => setShowTechnical((v) => !v)}
            >
              {showTechnical ? "隐藏技术明细" : "查看技术明细"}
            </button>
          ) : null}
          {showTechnical ? (
            <ul className="template-validation-dock__list template-validation-dock__list--technical">
              {entries.map((entry) => (
                <li key={`tech-${entry.key}`} className="template-validation-dock__item">
                  <span className="template-validation-dock__text" title={entry.detail}>
                    {entry.detail}
                  </span>
                  <button
                    type="button"
                    className="template-validation-dock__copy"
                    onClick={() => void navigator.clipboard?.writeText(entry.detail)}
                  >
                    复制
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
