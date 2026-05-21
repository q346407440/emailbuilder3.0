import type { ReactNode } from "react";
import type { RelativePlacementUiMode } from "../../lib/placementConfigurability";
import { Field } from "./Field";
import { ShopSecondaryButton } from "./ShopFormControls";

export type PlacementAxisValue = "start" | "center" | "end";

type RelativePlacementControlProps = {
  mode: RelativePlacementUiMode;
  horizontal: PlacementAxisValue;
  vertical: PlacementAxisValue;
  hint?: string;
  disabled?: boolean;
  headerExtra?: ReactNode;
  onHorizontalChange: (value: PlacementAxisValue) => void;
  onVerticalChange: (value: PlacementAxisValue) => void;
};

const HORIZONTAL_OPTIONS: ReadonlyArray<{ value: PlacementAxisValue; label: string }> = [
  { value: "start", label: "居左" },
  { value: "center", label: "居中" },
  { value: "end", label: "居右" },
];

const VERTICAL_OPTIONS: ReadonlyArray<{ value: PlacementAxisValue; label: string }> = [
  { value: "start", label: "居上" },
  { value: "center", label: "居中" },
  { value: "end", label: "居下" },
];

function AlignHorizontalGlyph({ align }: { align: PlacementAxisValue }) {
  const x =
    align === "start" ? 2 : align === "center" ? 5 : 8;
  return (
    <svg className="placement-align-icon" viewBox="0 0 16 16" width={16} height={16} aria-hidden>
      <rect x={x} y={3} width={6} height={1.5} rx={0.5} fill="currentColor" />
      <rect x={x} y={7.25} width={6} height={1.5} rx={0.5} fill="currentColor" />
      <rect x={x} y={11.5} width={6} height={1.5} rx={0.5} fill="currentColor" />
    </svg>
  );
}

function AlignVerticalGlyph({ align }: { align: PlacementAxisValue }) {
  const y =
    align === "start" ? 2 : align === "center" ? 5 : 8;
  return (
    <svg className="placement-align-icon" viewBox="0 0 16 16" width={16} height={16} aria-hidden>
      <rect x={3} y={y} width={10} height={1.5} rx={0.5} fill="currentColor" />
      <rect x={5} y={y + 4.25} width={6} height={1.5} rx={0.5} fill="currentColor" />
      <rect x={3} y={y + 8.5} width={10} height={1.5} rx={0.5} fill="currentColor" />
    </svg>
  );
}

function PlacementAxisToolbar({
  axis,
  value,
  disabled,
  onChange,
}: {
  axis: "horizontal" | "vertical";
  value: PlacementAxisValue;
  disabled?: boolean;
  onChange: (value: PlacementAxisValue) => void;
}) {
  const options = axis === "horizontal" ? HORIZONTAL_OPTIONS : VERTICAL_OPTIONS;
  const Glyph = axis === "horizontal" ? AlignHorizontalGlyph : AlignVerticalGlyph;

  return (
    <div
      className={`inspector-icon-toggle-row placement-align-toolbar ${disabled ? "placement-align-toolbar--disabled" : ""}`}
      role="toolbar"
      aria-label={axis === "horizontal" ? "水平相对父级摆放" : "竖直相对父级摆放"}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <ShopSecondaryButton
            key={option.value}
            htmlType="button"
            disabled={disabled}
            title={option.label}
            aria-label={option.label}
            aria-pressed={pressed}
            className={`inspector-icon-toggle-row__btn ${pressed ? "inspector-icon-toggle-row__btn--active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            <Glyph align={option.value} />
          </ShopSecondaryButton>
        );
      })}
    </div>
  );
}

/** 容器相对父级摆放：按场景仅展示横排或纵排一组标准对齐图标；不可配时不渲染。 */
export function RelativePlacementControl({
  mode,
  horizontal,
  vertical,
  hint,
  disabled,
  headerExtra,
  onHorizontalChange,
  onVerticalChange,
}: RelativePlacementControlProps) {
  if (mode === "none") return null;

  return (
    <Field label="容器相对父级摆放" hint={hint} headerExtra={headerExtra}>
      {mode === "horizontal" ? (
        <PlacementAxisToolbar
          axis="horizontal"
          value={horizontal}
          disabled={disabled}
          onChange={onHorizontalChange}
        />
      ) : (
        <PlacementAxisToolbar
          axis="vertical"
          value={vertical}
          disabled={disabled}
          onChange={onVerticalChange}
        />
      )}
    </Field>
  );
}
