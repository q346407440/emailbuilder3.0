import type { ReactNode } from "react";
import type { ContentAlignAxisConfigurability } from "../../lib/contentAlignConfigurability";
import type { WrapperContentAlignHorizontal, WrapperContentAlignVertical } from "../../lib/wrapperContentAlign";
import { AlignAxisInspectorRow } from "./AlignAxisInspectorRow";
import { Field } from "./Field";

export type ContentAlignAxisControlProps = {
  label?: string;
  horizontal: WrapperContentAlignHorizontal;
  vertical: WrapperContentAlignVertical;
  horizontalAxis: ContentAlignAxisConfigurability;
  verticalAxis: ContentAlignAxisConfigurability;
  hint?: string;
  disabled?: boolean;
  headerExtra?: ReactNode;
  onHorizontalChange: (value: WrapperContentAlignHorizontal) => void;
  onVerticalChange: (value: WrapperContentAlignVertical) => void;
};

const HORIZONTAL_OPTIONS = [
  { value: "left" as const, shortLabel: "左", label: "靠左" },
  { value: "center" as const, shortLabel: "中", label: "水平居中" },
  { value: "right" as const, shortLabel: "右", label: "靠右" },
] as const;

const VERTICAL_OPTIONS = [
  { value: "top" as const, shortLabel: "上", label: "靠上" },
  { value: "center" as const, shortLabel: "中", label: "竖直居中" },
  { value: "bottom" as const, shortLabel: "下", label: "靠下" },
] as const;

function axisInspectorState(axis: ContentAlignAxisConfigurability): {
  notConfigurable: boolean;
  inspectorDegradeReason?: string;
} {
  if (axis.configurable) return { notConfigurable: false };
  return {
    notConfigurable: true,
    inspectorDegradeReason:
      axis.inspectorDegradeReason ?? axis.degradeReason ?? "当前不可配置",
  };
}

/** 容器内内容摆放：水平 / 竖直两行常显。 */
export function ContentAlignAxisControl({
  label = "容器内内容摆放",
  horizontal,
  vertical,
  horizontalAxis,
  verticalAxis,
  hint,
  disabled,
  headerExtra,
  onHorizontalChange,
  onVerticalChange,
}: ContentAlignAxisControlProps) {
  return (
    <Field label={label} hint={hint} headerExtra={headerExtra}>
      <div className="content-align-axis-stack">
        <AlignAxisInspectorRow
          axisLabel="水平对齐"
          ariaLabel="水平容器内内容对齐"
          value={horizontal}
          options={HORIZONTAL_OPTIONS}
          disabled={disabled}
          {...axisInspectorState(horizontalAxis)}
          onChange={onHorizontalChange}
        />
        <AlignAxisInspectorRow
          axisLabel="竖直对齐"
          ariaLabel="竖直容器内内容对齐"
          value={vertical}
          options={VERTICAL_OPTIONS}
          disabled={disabled}
          {...axisInspectorState(verticalAxis)}
          onChange={onVerticalChange}
        />
      </div>
    </Field>
  );
}
