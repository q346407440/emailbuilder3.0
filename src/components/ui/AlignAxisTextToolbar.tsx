import { ShopSegmented } from "./ShopFormControls";

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

/** 对齐轴三点切换：左/中/右 或 上/中/下（Segmented 分段样式） */
export function AlignAxisTextToolbar<T extends string>({
  ariaLabel,
  value,
  options,
  disabled,
  onChange,
}: AlignAxisTextToolbarProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel}>
      <ShopSegmented<T>
        value={value}
        disabled={disabled}
        options={options.map((option) => ({
          value: option.value,
          label: (
            <span title={option.label} aria-label={option.label}>
              {option.shortLabel}
            </span>
          ),
        }))}
        onChange={onChange}
      />
    </div>
  );
}
