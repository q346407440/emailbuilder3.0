type Props = {
  label: string;
  description?: string;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
};

/** 来源菜单统一行：主区选项与样式预设项共用同一套视觉与交互 */
export function FieldSourceMenuOption({ label, description, active, disabled, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`inspector-field-source__option${
        active ? " inspector-field-source__option--active" : ""
      }`}
      role="menuitemradio"
      aria-checked={active}
      disabled={disabled}
      onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
    >
      <span className="inspector-field-source__option-row">
        <span
          className={`inspector-field-source__check${active ? " inspector-field-source__check--on" : ""}`}
          aria-hidden="true"
        />
        <span className="inspector-field-source__option-body">
          <span className="inspector-field-source__option-title">{label}</span>
          {description ? (
            <span className="inspector-field-source__option-desc">{description}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
