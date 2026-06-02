export type WizardStepItem = { id: string; title: string };

type Props = {
  steps: WizardStepItem[];
  currentIndex: number;
  ariaLabel?: string;
};

/** 弹窗内分步向导顶栏（repeat 绑定、JSON 导入等共用） */
export function WizardStepNav({ steps, currentIndex, ariaLabel = "操作步骤" }: Props) {
  return (
    <nav className="wizard-step-nav" aria-label={ariaLabel}>
      <ol className="wizard-step-nav__list">
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const done = index < currentIndex;
          return (
            <li
              key={step.id}
              className={[
                "wizard-step-nav__item",
                active ? "wizard-step-nav__item--active" : "",
                done ? "wizard-step-nav__item--done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={active ? "step" : undefined}
            >
              <span className="wizard-step-nav__index">{done ? "✓" : index + 1}</span>
              <span className="wizard-step-nav__title">{step.title}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
