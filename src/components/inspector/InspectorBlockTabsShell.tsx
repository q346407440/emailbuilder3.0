import { memo, type ReactNode } from "react";
import { AdminInspectorTabs, type InspectorMainTab } from "../AdminInspectorTabs";

type Props = {
  inspectorBlockKey: string;
  active: InspectorMainTab;
  onChange: (tab: InspectorMainTab) => void;
  contentPane: ReactNode;
  stylePane: ReactNode;
  layoutPane: ReactNode;
  listPane?: ReactNode;
  visibilityPane?: ReactNode;
};

/**
 * Inspector 区块 Tab 壳：按 inspectorBlockKey memo，切换区块时不复用上一区块的 Tab 子树 reconcile。
 */
export const InspectorBlockTabsShell = memo(function InspectorBlockTabsShell({
  inspectorBlockKey,
  active,
  onChange,
  contentPane,
  stylePane,
  layoutPane,
  listPane,
  visibilityPane,
}: Props) {
  return (
    <AdminInspectorTabs
      key={inspectorBlockKey}
      active={active}
      onChange={onChange}
      contentPane={contentPane}
      stylePane={stylePane}
      layoutPane={layoutPane}
      listPane={listPane}
      visibilityPane={visibilityPane}
    />
  );
});
