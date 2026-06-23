import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  /** 默认展开；折叠时仍保持子节点挂载（富文本等） */
  defaultOpen?: boolean;
  keepMounted?: boolean;
  className?: string;
  /** nested：盒模型子分组（圆角 / 描边 / 边距等） */
  variant?: "default" | "nested";
};

/**
 * Inspector 分组折叠：标题行可点击，右侧 chevron；折叠时可选保留挂载。
 */
export function InspectorCollapsibleSection({
  title,
  children,
  defaultOpen = true,
  keepMounted = true,
  className,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const toggleLabel = open ? `折叠${title}` : `展开${title}`;

  return (
    <section
      className={[
        "inspector-collapsible-section",
        variant === "nested" ? "inspector-collapsible-section--nested" : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="inspector-collapsible-section__header"
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={toggleLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="inspector-collapsible-section__title">{title}</span>
        <span className="inspector-collapsible-section__chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {keepMounted ? (
        <div id={bodyId} className="inspector-collapsible-section__body" hidden={!open}>
          {children}
        </div>
      ) : open ? (
        <div id={bodyId} className="inspector-collapsible-section__body">
          {children}
        </div>
      ) : null}
    </section>
  );
}
