import { forwardRef, useMemo, useRef, type ComponentPropsWithoutRef, type ComponentRef, type ReactNode } from "react";
import { ColorPicker } from "antd";
import type { AggregationColor } from "antd/es/color-picker/color";
import { Field } from "./Field";
import { ShopSecondaryButton } from "./ShopFormControls";
import { useAdaptiveOverlayEdge } from "../../hooks/useAdaptiveOverlayEdge";
import { toAntdPlacement } from "../../lib/antdOverlayEdge";
import {
  parseCssColorToRgba,
  rgbaForPicker,
  rgbaToCss,
} from "../../lib/colorCss";

export type ColorFieldProps = {
  label: string;
  /** CSS 颜色字符串：支持 rgba()、rgb()、#rrggbb、#rgb、#rrggbbaa、transparent */
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  disabled?: boolean;
  headerExtra?: ReactNode;
  error?: string;
  warning?: string;
};

/** Ant Design ColorPicker 回调中的颜色对象 → 统一输出 rgba() */
function pickerColorToCss(c: AggregationColor): string {
  const { r, g, b, a } = c.toRgb();
  return rgbaToCss({ r, g, b, a });
}

const ColorSwatchTrigger = forwardRef<
  ComponentRef<typeof ShopSecondaryButton>,
  ComponentPropsWithoutRef<typeof ShopSecondaryButton> & {
    disabled?: boolean;
    open: boolean;
    fillCss: string;
  }
>(function ColorSwatchTrigger({ disabled, open, fillCss, ...rest }, ref) {
  return (
    <ShopSecondaryButton
      ref={ref}
      className="color-field__trigger"
      {...rest}
      disabled={disabled}
      draggable={false}
      aria-expanded={open}
      aria-haspopup="dialog"
      title="点击选择颜色（支持透明度）"
      onContextMenu={(e) => {
        // 长按/右键不出系统菜单，避免 Inspector 侧栏高度被连带撑动
        e.preventDefault();
      }}
    >
      <span className="color-field__trigger-fill" style={{ backgroundColor: fillCss }} />
    </ShopSecondaryButton>
  );
});

/**
 * 颜色编辑：点击色块展开 Ant Design ColorPicker。
 */
export function ColorField({
  label,
  value,
  onChange,
  hint,
  disabled,
  headerExtra,
  error,
  warning,
}: ColorFieldProps) {
  const triggerWrapRef = useRef<HTMLDivElement>(null);

  const pickerValue = useMemo(
    () => rgbaToCss(rgbaForPicker(value)),
    [value]
  );

  const parsedOk = parseCssColorToRgba(value.trim()) !== null;
  const fillCss = parsedOk ? value.trim() : rgbaToCss(rgbaForPicker(value));
  const { open, overlayEdge, overlayClassName, onVisibleChange } = useAdaptiveOverlayEdge({
    triggerRef: triggerWrapRef,
    preferredEdge: "topLeft",
    estimatedPopupHeight: 292,
    estimatedPopupWidth: 258,
    overlayClassName: "color-field__dropdown-overlay",
  });

  return (
    <Field label={label} hint={hint} headerExtra={headerExtra} error={error} warning={warning}>
      <div className={`color-field ${disabled ? "color-field--disabled" : ""}`}>
        <ColorPicker
          value={pickerValue}
          disabled={disabled}
          disabledAlpha={false}
          open={open}
          onChange={(c) => onChange(pickerColorToCss(c))}
          onOpenChange={onVisibleChange}
          placement={toAntdPlacement(overlayEdge)}
          rootClassName={overlayClassName}
          destroyOnHidden
          getPopupContainer={(triggerNode) =>
            triggerNode.ownerDocument?.body ?? triggerNode
          }
        >
          <div
            ref={triggerWrapRef}
            className="color-field__trigger-shell"
            onContextMenu={(e) => {
              e.preventDefault();
            }}
          >
            <ColorSwatchTrigger disabled={disabled} open={open} fillCss={fillCss} />
          </div>
        </ColorPicker>
      </div>
    </Field>
  );
}
