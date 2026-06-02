/** 多选列表首列：原生 checkbox，与 {@link SelectablePickerTable} 选择列视觉对齐 */
export function SelectablePickerCheckboxCell({
  checked,
  indeterminate,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="selectable-picker-table__checkbox-slot">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
