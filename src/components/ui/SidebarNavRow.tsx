import type { ReactNode } from "react";

type Props = {
  active?: boolean;
  title: string;
  meta?: string;
  onSelect: () => void;
  /** 悬停 / 聚焦 / 选中时显示在右侧的操作区 */
  actions?: ReactNode;
  className?: string;
  /** 主按钮 title（如校验摘要） */
  rowTitle?: string;
};

/** 侧栏导航行：主区可点选，右侧操作仅在需要时出现且不遮挡文案 */
export function SidebarNavRow({
  active,
  title,
  meta,
  onSelect,
  actions,
  className,
  rowTitle,
}: Props) {
  return (
    <li
      className={[
        "sidebar-nav-row",
        active ? "sidebar-nav-row--active" : "",
        actions ? "sidebar-nav-row--has-actions" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button type="button" className="sidebar-nav-row__main" onClick={onSelect} title={rowTitle}>
        <span className="sidebar-nav-row__title">{title}</span>
        {meta ? <span className="sidebar-nav-row__meta">{meta}</span> : null}
      </button>
      {actions ? <div className="sidebar-nav-row__actions">{actions}</div> : null}
    </li>
  );
}
