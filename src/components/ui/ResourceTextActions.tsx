export type ResourceTextActionItem = {
  id: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
};

type Props = {
  items: ResourceTextActionItem[];
  busy?: boolean;
  className?: string;
  /** 无障碍：操作组名称 */
  ariaLabel?: string;
};

/** 文本操作条：侧栏分组头 / 列表行，以及资源选择下拉底部 */
export function ResourceTextActions({ items, busy, className, ariaLabel }: Props) {
  return (
    <div
      className={["resource-text-actions", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={[
            "resource-text-action",
            item.danger ? "resource-text-action--danger" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={Boolean(item.disabled || busy)}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
