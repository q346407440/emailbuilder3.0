import type { AiStepUiState } from "../../layout-variant-ai-contract/progress";

type LayoutVariantAiStepListProps = {
  steps: AiStepUiState[];
};

function StepIcon({ status }: { status: AiStepUiState["status"] }) {
  switch (status) {
    case "pending":
      return (
        <span className="layout-variant-ai-step__icon layout-variant-ai-step__icon--pending" aria-hidden>
          −
        </span>
      );
    case "running":
      return (
        <span
          className="layout-variant-ai-step__icon layout-variant-ai-step__icon--running"
          aria-hidden
        />
      );
    case "failed_once":
    case "failed":
      return (
        <span className="layout-variant-ai-step__icon layout-variant-ai-step__icon--failed" aria-hidden>
          ×
        </span>
      );
    case "success":
      return (
        <span className="layout-variant-ai-step__icon layout-variant-ai-step__icon--success" aria-hidden>
          ✓
        </span>
      );
    default:
      return null;
  }
}

/** 以图 AI 创建：分步进度列表（每行独立；重试 append 新行，失败行保留）。 */
export function LayoutVariantAiStepList({ steps }: LayoutVariantAiStepListProps) {
  if (steps.length === 0) return null;
  return (
    <ol className="layout-variant-ai-step-list" aria-label="生成步骤">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`layout-variant-ai-step layout-variant-ai-step--${step.status}`}
        >
          <StepIcon status={step.status} />
          <span className="layout-variant-ai-step__label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
