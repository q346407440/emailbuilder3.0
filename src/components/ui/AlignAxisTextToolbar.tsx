import { ShopSecondaryButton } from "./ShopFormControls";

export type AlignAxisTextOption<T extends string> = {
  value: T;
  /** 按钮上展示的短文案，如「左」「中」「右」 */
  shortLabel: string;
  /** 无障碍与悬停说明 */
  label: string;
};

type AlignAxisTextToolbarProps<T extends string> = {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<AlignAxisTextOption<T>>;
  disabled?: boolean;
  onChange: (value: T) => void;
};

/** 对齐轴三点切换：左/中/右 或 上/中/下 */
export function AlignAxisTextToolbar<T extends string>({
  ariaLabel,
  value,
  options,
  disabled,
  onChange,
}: AlignAxisTextToolbarProps<T>) {
  return (
    <div
      className={`inspector-align-text-toggle-row content-align-toolbar ${disabled ? "content-align-toolbar--disabled" : ""}`}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <ShopSecondaryButton
            key={option.value}
            htmlType="button"
            disabled={disabled}
            title={option.label}
            aria-label={option.label}
            aria-pressed={pressed}
            className={`inspector-align-text-toggle-row__btn ${pressed ? "inspector-align-text-toggle-row__btn--active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.shortLabel}
          </ShopSecondaryButton>
        );
      })}
    </div>
  );
}
