import type { ReactNode } from "react";
import { Field } from "./Field";
import { ShopSecondaryButton } from "./ShopFormControls";

type AlignmentGridOption<THorizontal extends string, TVertical extends string> = {
  horizontal: THorizontal;
  vertical: TVertical;
  label: string;
};

export type AlignmentGridProps<THorizontal extends string, TVertical extends string> = {
  label: string;
  horizontal: THorizontal;
  vertical: TVertical;
  options: ReadonlyArray<AlignmentGridOption<THorizontal, TVertical>>;
  onChange: (next: { horizontal: THorizontal; vertical: TVertical }) => void;
  hint?: string;
  disabled?: boolean;
  headerExtra?: ReactNode;
  /** 为 true 时仅渲染矩阵，不包 Field（供 RelativePlacementControl 等外层已包 Field 的场景） */
  bare?: boolean;
};

function FocusGlyph({ row, col }: { row: number; col: number }) {
  const dotLeft = col === 0 ? "18%" : col === 1 ? "50%" : "82%";
  const dotTop = row === 0 ? "18%" : row === 1 ? "50%" : "82%";
  return (
    <span className="image-object-position-grid__frame" aria-hidden>
      <span
        className="image-object-position-grid__dot"
        style={{ left: dotLeft, top: dotTop, transform: "translate(-50%, -50%)" }}
      />
    </span>
  );
}

/** 通用 3×3 对齐矩阵：用于容器内内容摆放与容器相对父级摆放。 */
export function AlignmentGrid<THorizontal extends string, TVertical extends string>({
  label,
  horizontal,
  vertical,
  options,
  onChange,
  hint,
  disabled,
  headerExtra,
  bare = false,
}: AlignmentGridProps<THorizontal, TVertical>) {
  const matrix = (
    <div
      className={`image-object-position-grid ${disabled ? "image-object-position-grid--disabled" : ""}`}
      role="group"
      aria-label={label || "对齐"}
    >
      <div className="image-object-position-grid__matrix">
        {options.map((option, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const pressed = option.horizontal === horizontal && option.vertical === vertical;
          return (
            <ShopSecondaryButton
              key={`${option.horizontal}-${option.vertical}`}
              htmlType="button"
              disabled={disabled}
              title={option.label}
              aria-label={option.label}
              aria-pressed={pressed}
              className={`inspector-icon-toggle-row__btn image-object-position-grid__btn ${pressed ? "inspector-icon-toggle-row__btn--active" : ""}`}
              onClick={() =>
                onChange({ horizontal: option.horizontal, vertical: option.vertical })
              }
            >
              <FocusGlyph row={row} col={col} />
            </ShopSecondaryButton>
          );
        })}
      </div>
    </div>
  );
  if (bare) return matrix;
  return (
    <Field label={label} hint={hint} headerExtra={headerExtra}>
      {matrix}
    </Field>
  );
}
