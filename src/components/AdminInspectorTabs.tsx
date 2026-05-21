import type { ReactNode } from "react";
import { Tabs } from "@shoplazza/sds";

/** 与属性面板「内容 / 样式 / 布局 / 列表 / 显隐」栏对应的受控 key */
export type InspectorMainTab = "content" | "style" | "layout" | "list" | "visibility";

type Props = {
  active: InspectorMainTab;
  onChange: (tab: InspectorMainTab) => void;
  /** 与折扣后台「全部 / 未开始 / 进行中」一致：SDS Tabs 顶栏 + 底部选中墨条（取样 flashclothing 折扣活动页） */
  contentPane: ReactNode;
  stylePane: ReactNode;
  layoutPane: ReactNode;
  /** 列表重复：仅当选中区块处于可配置 repeat 的上下文时展示。 */
  listPane?: ReactNode;
  /** 仅普通 block 展示；邮件根节点不需要显隐配置。 */
  visibilityPane?: ReactNode;
};

/**
 * 属性面板专用 Tabs：封装 @shoplazza/sds 的 Tabs，统一样式类名便于与工作台对齐。
 * destroyInactiveTabPane=false：切换 Tab 时保留面板挂载状态（如富文本编辑器）。
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
  return (
    <Tabs
      className="admin-inspector-tabs"
      activeKey={active}
      onChange={(key) => onChange(key as InspectorMainTab)}
      destroyInactiveTabPane={false}
      size="small"
    >
      <Tabs.TabPane tab="内容" key="content">
        <div className="inspector-tab-panel">{contentPane}</div>
      </Tabs.TabPane>
      <Tabs.TabPane tab="样式" key="style">
        <div className="inspector-tab-panel">{stylePane}</div>
      </Tabs.TabPane>
      <Tabs.TabPane tab="布局" key="layout">
        <div className="inspector-tab-panel">{layoutPane}</div>
      </Tabs.TabPane>
      {listPane ? (
        <Tabs.TabPane tab="列表" key="list">
          <div className="inspector-tab-panel">{listPane}</div>
        </Tabs.TabPane>
      ) : null}
      {visibilityPane ? (
        <Tabs.TabPane tab="显隐" key="visibility">
          <div className="inspector-tab-panel">{visibilityPane}</div>
        </Tabs.TabPane>
      ) : null}
    </Tabs>
  );
}
