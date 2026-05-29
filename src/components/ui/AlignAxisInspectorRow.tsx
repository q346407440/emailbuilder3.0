import { AlignAxisTextToolbar, type AlignAxisTextOption } from "./AlignAxisTextToolbar";

/** 对齐轴一行：小标题 →（不可配时）红色说明 → 三点按钮 */
export function AlignAxisInspectorRow<T extends string>({
  axisLabel,
  ariaLabel,
  value,
  options,
  disabled,
  notConfigurable,
  inspectorDegradeReason,
  onChange,
}: {
  axisLabel: string;
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<AlignAxisTextOption<T>>;
  disabled?: boolean;
  /** 该轴当前不可编辑（置灰工具条） */
  notConfigurable?: boolean;
  /** 不可配时展示在小标题下方的简短说明（红色） */
  inspectorDegradeReason?: string;
  onChange: (value: T) => void;
}) {
  const axisDisabled = disabled || notConfigurable;

  return (
    <div className="content-align-axis-row">
      <span className="content-align-axis-row__label">{axisLabel}</span>
      {inspectorDegradeReason ? (
        <p className="content-align-axis-row__degrade content-align-axis-row__degrade--blocked">
          {inspectorDegradeReason}
        </p>
      ) : null}
      <div className="content-align-axis-row__controls">
        <AlignAxisTextToolbar
          ariaLabel={ariaLabel}
          value={value}
          options={options}
          disabled={axisDisabled}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
