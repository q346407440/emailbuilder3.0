import { memo, useEffect, useState, type ReactNode } from "react";
import { AdminInspectorTabs, type InspectorMainTab } from "../AdminInspectorTabs";

type Props = {
  inspectorBlockKey: string;
  active: InspectorMainTab;
  onChange: (tab: InspectorMainTab) => void;
  componentPane: ReactNode;
  wrapperPane: ReactNode;
  listPane?: ReactNode;
  visibilityPane?: ReactNode;
};

/**
 * Inspector 区块 Tab 壳：按 inspectorBlockKey 隔离；已访问 Tab 保持挂载，未访问 Tab 懒渲染。
 */
export const InspectorBlockTabsShell = memo(function InspectorBlockTabsShell({
  inspectorBlockKey,
  active,
  onChange,
  componentPane,
  wrapperPane,
  listPane,
  visibilityPane,
}: Props) {
  const [visitedTabs, setVisitedTabs] = useState<Set<InspectorMainTab>>(() => new Set([active]));

  useEffect(() => {
    setVisitedTabs(new Set([active]));
  }, [inspectorBlockKey]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(active)) return prev;
      const next = new Set(prev);
      next.add(active);
      return next;
    });
  }, [active]);

  const shouldRenderPane = (tab: InspectorMainTab) => visitedTabs.has(tab);

  return (
    <AdminInspectorTabs
      key={inspectorBlockKey}
      active={active}
      onChange={onChange}
      shouldRenderPane={shouldRenderPane}
      componentPane={componentPane}
      wrapperPane={wrapperPane}
      listPane={listPane}
      visibilityPane={visibilityPane}
    />
  );
});
