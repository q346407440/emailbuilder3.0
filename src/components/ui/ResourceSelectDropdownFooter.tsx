import type { ReactElement } from "react";
import { ResourceTextActions, type ResourceTextActionItem } from "./ResourceTextActions";

type Props = {
  menu: ReactElement;
  actions: ResourceTextActionItem[];
  actionsAriaLabel: string;
  busy?: boolean;
  /** 执行操作后回调（例如关闭下拉） */
  onAfterAction?: () => void;
};

/** 资源选择下拉底部操作区：避免在顶栏常驻 CRUD 按钮 */
export function ResourceSelectDropdownFooter({
  menu,
  actions,
  actionsAriaLabel,
  busy,
  onAfterAction,
}: Props) {
  const wrappedActions = actions.map((item) => ({
    ...item,
    onClick: () => {
      item.onClick();
      onAfterAction?.();
    },
  }));

  return (
    <>
      {menu}
      <div
        className="resource-select-dropdown__footer"
        onMouseDown={(event) => event.preventDefault()}
      >
        <ResourceTextActions
          items={wrappedActions}
          busy={busy}
          ariaLabel={actionsAriaLabel}
          className="resource-select-dropdown__actions"
        />
      </div>
    </>
  );
}
