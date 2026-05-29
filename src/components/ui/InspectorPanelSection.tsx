import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** 右侧配置面板统一分组：类型标题 + 配置项容器 */
export function InspectorPanelSection({ title, children, className, bodyClassName }: Props) {
  return (
    <section className={["inspector-panel-section", className].filter(Boolean).join(" ")}>
      <h3 className="inspector-panel-section__title">{title}</h3>
      <div className={["inspector-panel-section__body", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </section>
  );
}
