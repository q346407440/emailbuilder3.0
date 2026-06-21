import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type CSSProperties,
  type ElementRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button, Input, Segmented, Select, Space } from "antd";
import type { ButtonProps } from "antd";
import type { InputProps, InputRef } from "antd/es/input";
import type { SegmentedProps } from "antd/es/segmented";
import type { SelectProps } from "antd/es/select";

const fullWidth = { width: "100%" as const };

/**
 * Ant Design Input：默认铺满容器宽度，便于 Inspector / 顶栏等表单布局。
 */
export const ShopInput = forwardRef<InputRef, InputProps>(function ShopInput(
  { style, ...rest },
  ref
) {
  return <Input ref={ref} {...rest} style={{ ...fullWidth, ...style }} />;
});

type ShopInputWithSuffixProps = InputProps & {
  suffixText?: ReactNode;
};

/** 输入框右侧可追加补充说明（如 0/100、px、%）。 */
export const ShopInputWithSuffix = forwardRef<InputRef, ShopInputWithSuffixProps>(
  function ShopInputWithSuffix({ style, suffixText, ...rest }, ref) {
    if (suffixText == null || suffixText === false) {
      return <Input ref={ref} {...rest} style={{ ...fullWidth, ...style }} />;
    }
    return (
      <Space.Compact className="shop-input-compact" style={{ ...fullWidth, ...style }}>
        <Input ref={ref} {...rest} />
        <span className="shop-input-compact__suffix">{suffixText}</span>
      </Space.Compact>
    );
  }
);

type ShopUnitInputProps = Omit<InputProps, "value" | "onChange"> & {
  value: string;
  unit: string;
  onChange: (next: string) => void;
};

type ShopCountInputProps = Omit<InputProps, "value" | "onChange"> & {
  value: string;
  maxLength: number;
  onChange: (next: string) => void;
};

type ShopCountTextAreaProps = Omit<
  ComponentPropsWithoutRef<typeof Input.TextArea>,
  "value" | "onChange"
> & {
  value: string;
  maxLength: number;
  onChange: (next: string) => void;
};

function toNumericDisplay(value: string, unit: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  if (unit && normalized.endsWith(unit)) {
    return normalized.slice(0, Math.max(0, normalized.length - unit.length)).trim();
  }
  const numericPart = normalized.match(/^-?\d*\.?\d+/);
  return numericPart ? numericPart[0] : normalized;
}

/** 单位输入：用户只输入数值，组件自动拼接单位并回传（如 12 -> 12px）。 */
export const ShopUnitInput = forwardRef<InputRef, ShopUnitInputProps>(function ShopUnitInput(
  { value, unit, onChange, onBlur, ...rest },
  ref
) {
  const displayValue = useMemo(() => toNumericDisplay(value, unit), [value, unit]);
  const [draftValue, setDraftValue] = useState(displayValue);
  const focusedRef = useRef(false);
  const valueBeforeEditRef = useRef(value);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraftValue(displayValue);
    }
  }, [displayValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (!raw) {
      const d = displayValue.trim();
      if (d) {
        setDraftValue(d);
      } else {
        setDraftValue("0");
        onChange(`0${unit}`);
      }
      return;
    }
    setDraftValue(e.target.value);
    onChange(`${raw}${unit}`);
  };

  const handleFocus = () => {
    focusedRef.current = true;
    valueBeforeEditRef.current = value;
  };

  const handleBlur: NonNullable<InputProps["onBlur"]> = (e) => {
    focusedRef.current = false;
    if (!draftValue.trim()) {
      onChange(valueBeforeEditRef.current);
    } else {
      setDraftValue(toNumericDisplay(value, unit));
    }
    onBlur?.(e);
  };

  return (
    <ShopInputWithSuffix
      ref={ref}
      {...rest}
      type="number"
      inputMode="decimal"
      value={draftValue}
      onChange={handleChange}
      onFocus={handleFocus}
      suffixText={unit}
      onBlur={handleBlur}
    />
  );
});

/** 字符计数输入：右侧显示 x/max，统一文案输入交互。 */
export const ShopCountInput = forwardRef<InputRef, ShopCountInputProps>(function ShopCountInput(
  { value, maxLength, onChange, ...rest },
  ref
) {
  const currentLength = value.length;
  return (
    <ShopInputWithSuffix
      ref={ref}
      {...rest}
      type="text"
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      suffixText={`${currentLength}/${maxLength}`}
    />
  );
});

/** 多行字符计数输入：底部显示 x/max，统一长文本输入交互。 */
export const ShopCountTextArea = forwardRef<
  ElementRef<typeof Input.TextArea>,
  ShopCountTextAreaProps
>(function ShopCountTextArea({ value, maxLength, onChange, ...rest }, ref) {
  const currentLength = value.length;
  return (
    <div className="shop-count-textarea">
      <ShopTextArea
        ref={ref}
        {...rest}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="shop-count-textarea__suffix">{`${currentLength}/${maxLength}`}</div>
    </div>
  );
});

export const ShopTextArea = forwardRef<
  ElementRef<typeof Input.TextArea>,
  ComponentPropsWithoutRef<typeof Input.TextArea>
>(function ShopTextArea({ style, ...rest }, ref) {
  return <Input.TextArea ref={ref} {...rest} style={{ ...fullWidth, ...style }} />;
});

type ShopSelectExtraProps = {
  popupMatchSelectWidth?: boolean;
  dropdownRender?: (menu: ReactElement) => ReactElement;
  /** @deprecated 请用 `styles.popup.root` */
  dropdownStyle?: CSSProperties;
  /** @deprecated 请用 `onOpenChange` */
  onDropdownVisibleChange?: (open: boolean) => void;
};

function ShopSelectInner<ValueType = unknown>(
  props: SelectProps<ValueType> & ShopSelectExtraProps
) {
  const {
    style,
    dropdownStyle,
    onDropdownVisibleChange,
    styles,
    onOpenChange,
    ...rest
  } = props;
  const mergedStyles =
    dropdownStyle != null
      ? {
          ...styles,
          popup: {
            ...styles?.popup,
            root: { ...dropdownStyle, ...styles?.popup?.root },
          },
        }
      : styles;

  return (
    <Select<ValueType>
      {...rest}
      styles={mergedStyles}
      onOpenChange={onOpenChange ?? onDropdownVisibleChange}
      style={{ ...fullWidth, ...style }}
    />
  );
}

/** Ant Design Select：用法与 Select 相同（含 ShopSelect.Option）。 */
export const ShopSelect = Object.assign(ShopSelectInner, {
  Option: Select.Option,
  OptGroup: Select.OptGroup,
});

/** Ant Design Segmented：默认 block 铺满容器，用于 Inspector 等表单分段切换。 */
export function ShopSegmented<ValueType extends string | number>(
  props: SegmentedProps<ValueType>
) {
  const { style, block = true, className, ...rest } = props;
  return (
    <Segmented<ValueType>
      block={block}
      className={joinClassNames("shop-segmented", className)}
      style={{ ...fullWidth, ...style }}
      {...rest}
    />
  );
}

type ShopActionButtonProps = Omit<ButtonProps, "type">;

function joinClassNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/** 企业级文字链主操作（确定、保存、重命名等，主题蓝）。 */
export const ShopPrimaryButton = forwardRef<ComponentRef<typeof Button>, ShopActionButtonProps>(
  function ShopPrimaryButton({ className, htmlType = "button", ...rest }, ref) {
    return (
      <Button
        ref={ref}
        {...rest}
        type="link"
        htmlType={htmlType}
        className={joinClassNames("shop-btn", "shop-btn--primary", className)}
      />
    );
  }
);

/** 企业级文字链次级操作（取消等，中性灰字）。 */
export const ShopSecondaryButton = forwardRef<ComponentRef<typeof Button>, ShopActionButtonProps>(
  function ShopSecondaryButton({ className, htmlType = "button", ...rest }, ref) {
    return (
      <Button
        ref={ref}
        {...rest}
        type="link"
        htmlType={htmlType}
        className={joinClassNames("shop-btn", "shop-btn--secondary", className)}
      />
    );
  }
);

/** 企业级文字链危险操作（删除、确认删除等，警示红）。 */
export const ShopDangerButton = forwardRef<ComponentRef<typeof Button>, ShopActionButtonProps>(
  function ShopDangerButton({ className, htmlType = "button", ...rest }, ref) {
    return (
      <Button
        ref={ref}
        {...rest}
        type="link"
        htmlType={htmlType}
        className={joinClassNames("shop-btn", "shop-btn--danger", className)}
      />
    );
  }
);

export type { InputRef };
