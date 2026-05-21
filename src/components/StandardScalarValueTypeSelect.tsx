import {
  STANDARD_SCALAR_VALUE_TYPES,
  standardScalarValueTypeLabel,
  type StandardScalarValueType,
} from "../lib/standardScalarSlotTypes";
import { ShopSelect } from "./ui/ShopFormControls";

export type StandardScalarValueTypeSelectProps = {
  id?: string;
  value: StandardScalarValueType;
  disabled?: boolean;
  onChange: (valueType: StandardScalarValueType) => void;
};

export function StandardScalarValueTypeSelect({
  id,
  value,
  disabled,
  onChange,
}: StandardScalarValueTypeSelectProps) {
  return (
    <ShopSelect
      id={id}
      value={value}
      disabled={disabled}
      onChange={(next) => onChange(String(next) as StandardScalarValueType)}
    >
      {STANDARD_SCALAR_VALUE_TYPES.map((valueType) => (
        <ShopSelect.Option key={valueType} value={valueType}>
          {standardScalarValueTypeLabel(valueType)}
        </ShopSelect.Option>
      ))}
    </ShopSelect>
  );
}
