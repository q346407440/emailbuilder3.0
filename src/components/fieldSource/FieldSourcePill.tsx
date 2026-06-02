import type { FieldSourcePillDisplay } from "../../lib/fieldSourceUiCopy";

type Props = {
  display: FieldSourcePillDisplay;
  open: boolean;
  onToggle: () => void;
};

/** Inspector 字段来源胶囊触发器（统一样式与无障碍属性） */
export function FieldSourcePill({ display, open, onToggle }: Props) {
  const className = [
    "inspector-field-source__pill",
    `inspector-field-source__pill--${display.variant}`,
    display.detached ? "inspector-field-source__pill--detached" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      title={display.title}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onToggle}
    >
      <span className="inspector-field-source__dot" aria-hidden="true" />
      <span className="inspector-field-source__text">{display.label}</span>
    </button>
  );
}
