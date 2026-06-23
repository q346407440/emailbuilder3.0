import type { ReactNode } from "react";
import { Tabs } from "antd";

/** 与属性面板「组件配置 / 容器配置 / 数据组 / 显隐」栏对应的受控 key */
export type InspectorMainTab = "component" | "wrapper" | "list" | "visibility";

type Props = {
  active: InspectorMainTab;
  onChange: (tab: InspectorMainTab) => void;
  /** 为 false 时暂不挂载 Tab 面板（首次切换后再挂载并保留） */
  shouldRenderPane?: (tab: InspectorMainTab) => boolean;
  componentPane: ReactNode;
  wrapperPane: ReactNode;
  listPane?: ReactNode;
  visibilityPane?: ReactNode;
};

function renderTabPanel(tab: InspectorMainTab, pane: ReactNode, shouldRenderPane?: (tab: InspectorMainTab) => boolean) {
  if (shouldRenderPane && !shouldRenderPane(tab)) {
    return null;
  }
  return <div className="inspector-tab-panel">{pane}</div>;
}

/**
 * 属性面板专用 Tabs：封装 Ant Design Tabs，统一样式类名便于与工作台对齐。
 * destroyOnHidden=false：切换 Tab 时保留面板挂载状态（如富文本编辑器）。
 */
export function AdminInspectorTabs({
  active,
  onChange,
  shouldRenderPane,
  componentPane,
  wrapperPane,
  listPane,
  visibilityPane,
}: Props) {
  const items = [
    {
      key: "component",
      label: "组件配置",
      forceRender: shouldRenderPane ? shouldRenderPane("component") : false,
      children: renderTabPanel("component", componentPane, shouldRenderPane),
    },
    {
      key: "wrapper",
      label: "容器配置",
      forceRender: shouldRenderPane ? shouldRenderPane("wrapper") : false,
      children: renderTabPanel("wrapper", wrapperPane, shouldRenderPane),
    },
    ...(listPane
      ? [
          {
            key: "list",
            label: "数据组",
            forceRender: shouldRenderPane ? shouldRenderPane("list") : false,
            children: renderTabPanel("list", listPane, shouldRenderPane),
          },
        ]
      : []),
    ...(visibilityPane
      ? [
          {
            key: "visibility",
            label: "显隐",
            forceRender: shouldRenderPane ? shouldRenderPane("visibility") : false,
            children: renderTabPanel("visibility", visibilityPane, shouldRenderPane),
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
