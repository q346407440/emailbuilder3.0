import type { ReactNode } from "react";
import { IMAGE_OBJECT_POSITION_PRESETS, matchImageObjectPositionPreset } from "../../lib/imageObjectPosition";
import { Field } from "./Field";
import { ShopInput, ShopSecondaryButton } from "./ShopFormControls";

export type ImageObjectPositionGridProps = {
  label: string;
  /** 模板中的原始取值（可为百分比等自定义 CSS） */
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  disabled?: boolean;
  headerExtra?: ReactNode;
};

/** 九宫格内焦点示意：小框 + 圆点位置（row/col ∈ 0..2） */
function FocusGlyph({ row, col }: { row: number; col: number }) {
  const dotLeft = col === 0 ? "18%" : col === 1 ? "50%" : "82%";
  const dotTop = row === 0 ? "18%" : row === 1 ? "50%" : "82%";
  return (
    <span className="image-object-position-grid__frame" aria-hidden>
      <span
        className="image-object-position-grid__dot"
        style={{
          left: dotLeft,
          top: dotTop,
          transform: "translate(-50%, -50%)",
        }}
      />
    </span>
  );
}

/**
 * 画面位置：3×3 裁剪焦点矩阵，选项来自 `IMAGE_OBJECT_POSITION_PRESETS`。
 * 自定义 object-position（非预设）时保留文本输入，避免无法编辑百分比等写法。
 */
export function ImageObjectPositionGrid({
  label,
  value,
  onChange,
  hint,
  disabled,
  headerExtra,
}: ImageObjectPositionGridProps) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const activePreset = matchImageObjectPositionPreset(trimmed);
  const isCustom = Boolean(trimmed && activePreset === null);

  return (
    <Field label={label} hint={hint} headerExtra={headerExtra}>
      <div
        className={`image-object-position-grid ${disabled ? "image-object-position-grid--disabled" : ""}`}
        role="group"
        aria-label={label}
      >
        <div className="image-object-position-grid__matrix">
          {IMAGE_OBJECT_POSITION_PRESETS.map((preset, idx) => {
            const row = Math.floor(idx / 3);
            const col = idx % 3;
            const pressed =
              !isCustom && activePreset !== null && activePreset === preset.value;
            return (
              <ShopSecondaryButton
                key={preset.value}
                htmlType="button"
                disabled={disabled}
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={pressed}
                className={`inspector-icon-toggle-row__btn image-object-position-grid__btn ${pressed ? "inspector-icon-toggle-row__btn--active" : ""}`}
                onClick={() => onChange(preset.value)}
              >
                <FocusGlyph row={row} col={col} />
              </ShopSecondaryButton>
            );
          })}
        </div>
        {isCustom ? (
          <div className="image-object-position-grid__custom">
            <p className="image-object-position-grid__custom-hint">
              当前为自定义对齐（{trimmed}）。可直接修改下方文本，或点击九宫格改用预设。
            </p>
            <ShopInput
              disabled={disabled}
              value={trimmed}
              onChange={(e) => onChange(e.target.value)}
              placeholder="例如 center、40% 30%"
              aria-label="自定义画面位置（CSS object-position）"
            />
          </div>
        ) : null}
      </div>
    </Field>
  );
}
