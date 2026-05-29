import { Radio, Table } from "@shoplazza/sds";
import type { ColumnsType } from "@shoplazza/sds";
import type { ReactNode } from "react";

export type SelectablePickerColumn<T> = {
  key: string;
  title: ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  render: (row: T, index: number) => ReactNode;
};

export type SelectablePickerTableProps<T> = {
  ariaLabel: string;
  rowKey: (row: T) => string;
  columns: SelectablePickerColumn<T>[];
  dataSource: readonly T[];
  selectedKey: string | null | undefined;
  onSelect: (key: string) => void;
  radioName?: string;
  emptyText?: ReactNode;
  maxBodyHeight?: number | string;
  className?: string;
  getRowDisabled?: (row: T) => boolean;
};

/**
 * 弹窗/Inspector 内「单选 + 表格列」公共列表（Shoplazza SDS Table + Radio）。
 * 用于场景内置变量、payload 变量绑定等。
 */
export function SelectablePickerTable<T>({
  ariaLabel,
  rowKey,
  columns,
  dataSource,
  selectedKey,
  onSelect,
  radioName,
  emptyText = "暂无数据",
  maxBodyHeight = "min(52vh, 420px)",
  className,
  getRowDisabled,
}: SelectablePickerTableProps<T>) {
  const tableColumns: ColumnsType<T> = [
    {
      title: <span className="selectable-picker-table__sr-only">选择</span>,
      width: 48,
      align: "center",
      className: "selectable-picker-table__col-radio",
      render: (_value, row) => {
        const key = rowKey(row);
        const disabled = getRowDisabled?.(row) ?? false;
        const label = key;
        return (
          <div className="selectable-picker-table__radio-slot">
            <Radio
              name={radioName}
              checked={selectedKey === key}
              disabled={disabled}
              onChange={() => onSelect(key)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`选择 ${label}`}
            />
          </div>
        );
      },
    },
    ...columns.map((col) => ({
      title: col.title,
      key: col.key,
      width: col.width,
      align: col.align,
      ellipsis: col.ellipsis,
      className: `selectable-picker-table__col-${col.key}`,
      render: (_value: unknown, row: T, index: number) => col.render(row, index),
    })),
  ];

  return (
    <div
      className={["selectable-picker-table__wrap", className].filter(Boolean).join(" ")}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <Table<T>
        className="selectable-picker-table"
        size="small"
        bordered
        pagination={false}
        rowKey={(row) => rowKey(row)}
        columns={tableColumns}
        dataSource={[...dataSource]}
        scroll={maxBodyHeight ? { y: maxBodyHeight } : undefined}
        locale={{ emptyText }}
        onRow={(row) => {
          const key = rowKey(row);
          const disabled = getRowDisabled?.(row) ?? false;
          const selected = selectedKey === key;
          return {
            onClick: () => {
              if (!disabled) onSelect(key);
            },
            className: [
              "selectable-picker-table__row",
              selected ? "selectable-picker-table__row--selected" : "",
              disabled ? "selectable-picker-table__row--disabled" : "",
            ]
              .filter(Boolean)
              .join(" "),
          };
        }}
      />
    </div>
  );
}
