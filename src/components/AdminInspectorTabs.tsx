import type { ReactNode } from "react";
import { Tabs } from "antd";

/** 与属性面板「内容 / 样式 / 布局 / 列表 / 显隐」栏对应的受控 key */
export type InspectorMainTab = "content" | "style" | "layout" | "list" | "visibility";

type Props = {
  active: InspectorMainTab;
  onChange: (tab: InspectorMainTab) => void;
  /** 为 false 时暂不挂载 Tab 面板（首次切换后再挂载并保留） */
  shouldRenderPane?: (tab: InspectorMainTab) => boolean;
  contentPane: ReactNode;
  stylePane: ReactNode;
  layoutPane: ReactNode;
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
      forceRender: shouldRenderPane ? shouldRenderPane("content") : false,
      children: renderTabPanel("content", contentPane, shouldRenderPane),
    },
    {
      key: "style",
      label: "样式",
      forceRender: shouldRenderPane ? shouldRenderPane("style") : false,
      children: renderTabPanel("style", stylePane, shouldRenderPane),
    },
    {
      key: "layout",
      label: "布局",
      forceRender: shouldRenderPane ? shouldRenderPane("layout") : false,
      children: renderTabPanel("layout", layoutPane, shouldRenderPane),
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
