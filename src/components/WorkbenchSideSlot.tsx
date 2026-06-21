import type { ReactNode } from "react";
import type { WorkbenchView } from "../lib/validationIssueContext";

type Props = {
  activeView: WorkbenchView;
  /** 空闲预布局完成后，非激活面板参与布局（visibility 隐藏），避免首次切 tab 才触发布局。 */
  layoutPrewarmed?: boolean;
  blockPane: ReactNode;
  payloadPane: ReactNode;
  tokensPane: ReactNode;
};

function SidePane({
  active,
  layoutPrewarmed,
  children,
}: {
  active: boolean;
  layoutPrewarmed: boolean;
  children: ReactNode;
}) {
  if (!active && !layoutPrewarmed) {
    return (
      <div className="workspace-side-slot__pane" hidden aria-hidden>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`workspace-side-slot__pane${active ? " workspace-side-slot__pane--active" : " workspace-side-slot__pane--inactive"}`}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

/**
 * 工作台左/右栏 slot：三视图常挂载，仅切换可见性，避免切顶栏 tab 时卸載重建 Inspector 等重组件。
 */
export function WorkbenchSideSlot({
  activeView,
  layoutPrewarmed = false,
  blockPane,
  payloadPane,
  tokensPane,
}: Props) {
  return (
    <div className="workspace-side-slot">
      <SidePane active={activeView === "block"} layoutPrewarmed={layoutPrewarmed}>
        {blockPane}
      </SidePane>
      <SidePane active={activeView === "payload"} layoutPrewarmed={layoutPrewarmed}>
        {payloadPane}
      </SidePane>
      <SidePane active={activeView === "tokens"} layoutPrewarmed={layoutPrewarmed}>
        {tokensPane}
      </SidePane>
    </div>
  );
}
