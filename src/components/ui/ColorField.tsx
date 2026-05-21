import { forwardRef, useMemo, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ColorPicker } from "@shoplazza/sds";
import { Field } from "./Field";
import { ShopSecondaryButton } from "./ShopFormControls";
import { useAdaptiveOverlayPlacement } from "../../hooks/useAdaptiveOverlayPlacement";
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
};

/** SDS ColorPicker 回调中的颜色对象 → 统一输出 rgba() */
function pickerColorToCss(c: {
  toRgb: () => { r: number; g: number; b: number };
  getAlpha: () => number;
}): string {
  const { r, g, b } = c.toRgb();
  return rgbaToCss({ r, g, b, a: c.getAlpha() });
}

const ColorSwatchTrigger = forwardRef<
  HTMLElement,
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
 * 颜色编辑：点击色块展开 SDS ColorPicker（与 Shoplazza 后台限时促销「配色 · 自定义」交互一致）。
 */
export function ColorField({ label, value, onChange, hint, disabled, headerExtra }: ColorFieldProps) {
  const triggerWrapRef = useRef<HTMLDivElement>(null);

  const pickerValue = useMemo(
    () => rgbaToCss(rgbaForPicker(value)),
    [value]
  );

  const parsedOk = parseCssColorToRgba(value.trim()) !== null;
  const fillCss = parsedOk ? value.trim() : rgbaToCss(rgbaForPicker(value));
  const { open, placement, overlayClassName, onVisibleChange } = useAdaptiveOverlayPlacement({
    triggerRef: triggerWrapRef,
    preferredPlacement: "topLeft",
    estimatedPopupHeight: 292,
    estimatedPopupWidth: 258,
    overlayClassName: "color-field__dropdown-overlay",
  });

  return (
    <Field label={label} hint={hint} headerExtra={headerExtra}>
      <div className={`color-field ${disabled ? "color-field--disabled" : ""}`}>
        <ColorPicker
          value={pickerValue}
          disabled={disabled}
          disabledAlpha={false}
          onChange={(c) => onChange(pickerColorToCss(c))}
          dropdownProps={{
            placement,
            onVisibleChange,
            overlayClassName,
            /** 不向触发器追加 sds-dropdown-open，避免与按钮样式叠加引起布局抖动 */
            openClassName: "",
            destroyPopupOnHide: true,
            // 固定挂载到 body，避免展开面板时影响右侧属性区高度计算。
            getPopupContainer: (triggerNode: HTMLElement) =>
              triggerNode.ownerDocument?.body ?? triggerNode,
          }}
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
