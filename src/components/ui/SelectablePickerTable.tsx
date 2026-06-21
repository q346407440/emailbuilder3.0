import { Radio, Table } from "antd";
import type { ReactNode } from "react";
import { SelectablePickerCheckboxCell } from "./SelectablePickerCheckboxCell";

type PickerTableColumn<T extends object> = {
  title?: ReactNode;
  key?: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  className?: string;
  render?: (value: unknown, record: T, index: number) => ReactNode;
};

export type SelectablePickerColumn<T> = {
  key: string;
  title: ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  render: (row: T, index: number) => ReactNode;
};

export type PickerTableSelection<T extends object> =
  | {
      mode: "single";
      selectedKey: string | null | undefined;
      onSelect: (key: string) => void;
      radioName?: string;
      getRowDisabled?: (row: T) => boolean;
    }
  | {
      mode: "multiple";
      selectedKeys: ReadonlySet<string>;
      onToggle: (key: string, checked: boolean) => void;
      getRowDisabled?: (row: T) => boolean;
      selectAll?: {
        checked: boolean;
        indeterminate: boolean;
        disabled?: boolean;
        onChange: (checked: boolean) => void;
      };
    }
  | {
      mode: "custom";
      renderHeader?: ReactNode;
      renderCell: (row: T, index: number) => ReactNode;
    };

export type PickerTableProps<T extends object> = {
  ariaLabel: string;
  rowKey: (row: T) => string;
  columns: SelectablePickerColumn<T>[];
  dataSource: readonly T[];
  selection: PickerTableSelection<T>;
  emptyText?: ReactNode;
  maxBodyHeight?: number | string;
  className?: string;
  getRowClassName?: (row: T) => string | undefined;
};

function selectionColumnTitle<T extends object>(selection: PickerTableSelection<T>): ReactNode {
  if (selection.mode === "multiple" && selection.selectAll) {
    const { checked, indeterminate, disabled, onChange } = selection.selectAll;
    return (
      <SelectablePickerCheckboxCell
        checked={checked}
        indeterminate={indeterminate}
        disabled={disabled}
        label="全选当前列表"
        onChange={onChange}
      />
    );
  }
  if (selection.mode === "custom" && selection.renderHeader) {
    return selection.renderHeader;
  }
  return <span className="selectable-picker-table__sr-only">选择</span>;
}

function selectionColumnCell<T extends object>(
  row: T,
  index: number,
  rowKey: (row: T) => string,
  selection: PickerTableSelection<T>
): ReactNode {
  const key = rowKey(row);
  if (selection.mode === "single") {
    const disabled = selection.getRowDisabled?.(row) ?? false;
    return (
      <div className="selectable-picker-table__radio-slot">
        <Radio
          name={selection.radioName}
          checked={selection.selectedKey === key}
          disabled={disabled}
          onChange={() => selection.onSelect(key)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`选择 ${key}`}
        />
      </div>
    );
  }
  if (selection.mode === "multiple") {
    const disabled = selection.getRowDisabled?.(row) ?? false;
    const checked = selection.selectedKeys.has(key);
    return (
      <SelectablePickerCheckboxCell
        checked={checked}
        disabled={disabled}
        label={`选择 ${key}`}
        onChange={(next) => selection.onToggle(key, next)}
      />
    );
  }
  return selection.renderCell(row, index);
}

function rowIsSelected<T extends object>(row: T, rowKey: (row: T) => string, selection: PickerTableSelection<T>): boolean {
  const key = rowKey(row);
  if (selection.mode === "single") return selection.selectedKey === key;
  if (selection.mode === "multiple") return selection.selectedKeys.has(key);
  return false;
}

function rowIsDisabled<T extends object>(row: T, selection: PickerTableSelection<T>): boolean {
  if (selection.mode === "single" || selection.mode === "multiple") {
    return selection.getRowDisabled?.(row) ?? false;
  }
  return false;
}

/**
 * 弹窗/Inspector 内公共 antd Table 列表（支持单选 / 多选 / 自定义选择列）。
 * {@link SelectablePickerTable} 为其单选封装。
 */
export function PickerTable<T extends object>({
  ariaLabel,
  rowKey,
  columns,
  dataSource,
  selection,
  emptyText = "暂无数据",
  maxBodyHeight = "min(52vh, 420px)",
  className,
  getRowClassName,
}: PickerTableProps<T>) {
  const tableColumns: PickerTableColumn<T>[] = [
    {
      title: selectionColumnTitle(selection),
      width: 48,
      align: "center",
      className: "selectable-picker-table__col-radio",
      render: (_value: unknown, row: T, index: number) =>
        selectionColumnCell(row, index, rowKey, selection),
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

  const role = selection.mode === "single" ? "radiogroup" : undefined;

  return (
    <div
      className={["selectable-picker-table__wrap", className].filter(Boolean).join(" ")}
      role={role}
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
          const disabled = rowIsDisabled(row, selection);
          const selected = rowIsSelected(row, rowKey, selection);
          const extraClass = getRowClassName?.(row);
          return {
            onClick: () => {
              if (disabled) return;
              if (selection.mode === "single") {
                selection.onSelect(key);
                return;
              }
              if (selection.mode === "multiple") {
                selection.onToggle(key, !selection.selectedKeys.has(key));
              }
            },
            className: [
              "selectable-picker-table__row",
              selected ? "selectable-picker-table__row--selected" : "",
              disabled ? "selectable-picker-table__row--disabled" : "",
              extraClass,
            ]
              .filter(Boolean)
              .join(" "),
          };
        }}
      />
    </div>
  );
}

export type SelectablePickerTableProps<T extends object> = {
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

/** 单选 + antd Table（绑定变量等场景） */
export function SelectablePickerTable<T extends object>({
  ariaLabel,
  rowKey,
  columns,
  dataSource,
  selectedKey,
  onSelect,
  radioName,
  emptyText,
  maxBodyHeight,
  className,
  getRowDisabled,
}: SelectablePickerTableProps<T>) {
  return (
    <PickerTable
      ariaLabel={ariaLabel}
      rowKey={rowKey}
      columns={columns}
      dataSource={dataSource}
      emptyText={emptyText}
      maxBodyHeight={maxBodyHeight}
      className={className}
      selection={{
        mode: "single",
        selectedKey,
        onSelect,
        radioName,
        getRowDisabled,
      }}
    />
  );
}
