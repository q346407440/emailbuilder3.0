import type { ReactNode } from "react";
import { Tabs } from "antd";

/** 与属性面板「内容 / 样式 / 布局 / 列表 / 显隐」栏对应的受控 key */
export type InspectorMainTab = "content" | "style" | "layout" | "list" | "visibility";

type Props = {
  active: InspectorMainTab;
  onChange: (tab: InspectorMainTab) => void;
  contentPane: ReactNode;
  stylePane: ReactNode;
  layoutPane: ReactNode;
  listPane?: ReactNode;
  visibilityPane?: ReactNode;
};

/**
 * 属性面板专用 Tabs：封装 Ant Design Tabs，统一样式类名便于与工作台对齐。
 * destroyOnHidden=false：切换 Tab 时保留面板挂载状态（如富文本编辑器）。
 */
export function AdminInspectorTabs({
  active,
  onChange,
  contentPane,
  stylePane,
  layoutPane,
  listPane,
  visibilityPane,
}: Props) {
  const items = [
    {
      key: "content",
      label: "内容",
      forceRender: true,
      children: <div className="inspector-tab-panel">{contentPane}</div>,
    },
    {
      key: "style",
      label: "样式",
      forceRender: true,
      children: <div className="inspector-tab-panel">{stylePane}</div>,
    },
    {
      key: "layout",
      label: "布局",
      forceRender: true,
      children: <div className="inspector-tab-panel">{layoutPane}</div>,
    },
    ...(listPane
      ? [
          {
            key: "list",
            label: "数据组",
            forceRender: true,
            children: <div className="inspector-tab-panel">{listPane}</div>,
          },
        ]
      : []),
    ...(visibilityPane
      ? [
          {
            key: "visibility",
            label: "显隐",
            forceRender: true,
            children: <div className="inspector-tab-panel">{visibilityPane}</div>,
          },
        ]
      : []),
  ];

  return (
    <Tabs
      className="admin-inspector-tabs"
      activeKey={active}
      onChange={(key) => onChange(key as InspectorMainTab)}
      destroyOnHidden={false}
      size="small"
      items={items}
    />
  );
}
