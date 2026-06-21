import { Radio } from "antd";

/** 单选列表首列：antd Radio，与 {@link SelectablePickerTable} 视觉对齐 */
export function SelectablePickerRadioCell({
  name,
  checked,
  disabled,
  label,
  onChange,
}: {
  name?: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="selectable-picker-table__radio-slot">
      <Radio
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
      />
    </div>
  );
}
