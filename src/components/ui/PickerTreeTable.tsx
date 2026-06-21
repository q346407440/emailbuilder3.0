import type { ReactNode } from "react";

type PickerTreeTableColumn = {
  key: string;
  title: ReactNode;
  className?: string;
};

type PickerTreeTableProps = {
  ariaLabel: string;
  columns: PickerTreeTableColumn[];
  body: ReactNode;
  /** 无数据时在 tbody 内展示空状态（保留表头与表格容器） */
  emptyText?: ReactNode;
  className?: string;
  role?: "radiogroup" | "group";
  ariaReadonly?: boolean;
};

/**
 * 树状选择表格公共骨架：统一容器、表头与可滚动行为。
 * 业务侧仅关注行内容渲染，避免在多个弹窗重复维护同一套 table 结构。
 */
export function PickerTreeTable({
  ariaLabel,
  columns,
  body,
  emptyText,
  className,
  role = "radiogroup",
  ariaReadonly = false,
}: PickerTreeTableProps) {
  const showEmpty = emptyText != null && body == null;

  return (
    <div
      className={["text-body-var-pill-modal__table-wrap repeat-region-bind-modal__table-viewport", className]
        .filter(Boolean)
        .join(" ")}
      role={showEmpty ? "group" : role}
      aria-label={ariaLabel}
      aria-readonly={showEmpty || ariaReadonly || undefined}
    >
      <table className="text-body-var-pill-modal__table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className} scope="col">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showEmpty ? (
            <tr className="picker-tree-table__empty-row">
              <td className="picker-tree-table__empty-cell" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            body
          )}
        </tbody>
      </table>
    </div>
  );
}
