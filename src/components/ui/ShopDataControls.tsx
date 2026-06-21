import { Button, Switch, Table } from "antd";
import type { ButtonProps } from "antd";
import type { SwitchProps } from "antd";
import type { TableProps } from "antd";

/** CRM 列表等场景的实心主按钮（与文字链 ShopPrimaryButton 区分）。 */
export function ShopSolidButton(props: ButtonProps) {
  return <Button type="primary" {...props} />;
}

export function ShopSwitch(props: SwitchProps) {
  return <Switch {...props} />;
}

export function ShopDataTable<RecordType extends object>(props: TableProps<RecordType>) {
  return <Table<RecordType> {...props} />;
}

export type { TableColumnsType, TablePaginationConfig } from "antd";
