import type { ReactNode } from "react";
import type { WorkbenchView } from "../lib/validationIssueContext";

type Props = {
  activeView: WorkbenchView;
  blockPane: ReactNode;
  payloadPane: ReactNode;
  tokensPane: ReactNode;
};

function SidePane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="workspace-side-slot__pane" hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  );
}

/**
 * 工作台左/右栏 slot：三视图常挂载，仅切换可见性，避免切顶栏 tab 时卸載重建 Inspector 等重组件。
 */
export function WorkbenchSideSlot({ activeView, blockPane, payloadPane, tokensPane }: Props) {
  return (
    <div className="workspace-side-slot">
      <SidePane active={activeView === "block"}>{blockPane}</SidePane>
      <SidePane active={activeView === "payload"}>{payloadPane}</SidePane>
      <SidePane active={activeView === "tokens"}>{tokensPane}</SidePane>
    </div>
  );
}
