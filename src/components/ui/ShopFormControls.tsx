import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";
import { Button, Input, Select } from "@shoplazza/sds";
import type { ButtonProps } from "@shoplazza/sds";
import type { InputProps, InputRef } from "@shoplazza/sds";
import type { SelectProps } from "@shoplazza/sds";

const fullWidth = { width: "100%" as const };

/**
 * SDS Input：默认铺满容器宽度，便于 Inspector / 顶栏等表单布局。
 * 与 Shoplazza 后台折扣模块输入框（discount-input-affix-wrapper）一致的观感由 SDS 全局变量保证。
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

/** 与 Shoplazza 后台一致：输入框右侧可追加补充说明（如 0/100、px、%）。 */
export const ShopInputWithSuffix = forwardRef<InputRef, ShopInputWithSuffixProps>(
  function ShopInputWithSuffix({ style, suffixText, ...rest }, ref) {
    return (
      <Input
        ref={ref}
        {...rest}
        addonAfter={suffixText}
        style={{ ...fullWidth, ...style }}
      />
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
      // 禁止向父组件提交空串，避免画布/校验拿到非法 CSS（如 gap、字号为空）
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

function ShopSelectInner<ValueType = unknown>(props: SelectProps<ValueType>) {
  const { style, ...rest } = props;
  return <Select<ValueType> {...rest} style={{ ...fullWidth, ...style }} />;
}

/** SDS Select：替换原生 &lt;select&gt;，用法与 Select 相同（含 ShopSelect.Option）。 */
export const ShopSelect = Object.assign(ShopSelectInner, {
  Option: Select.Option,
  OptGroup: Select.OptGroup,
}) as typeof Select;

type ShopActionButtonProps = Omit<ButtonProps, "type">;

function joinClassNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/** 对齐折扣后台「新建折扣」主按钮视觉。 */
export const ShopPrimaryButton = forwardRef<HTMLElement, ShopActionButtonProps>(
  function ShopPrimaryButton({ className, htmlType = "button", ...rest }, ref) {
    return (
      <Button
        ref={ref}
        {...rest}
        type="primary"
        htmlType={htmlType}
        className={joinClassNames("shop-btn", "shop-btn--primary", className)}
      />
    );
  }
);

/** 对齐折扣后台「折扣设计」次级按钮视觉。 */
export const ShopSecondaryButton = forwardRef<HTMLElement, ShopActionButtonProps>(
  function ShopSecondaryButton({ className, htmlType = "button", ...rest }, ref) {
    return (
      <Button
        ref={ref}
        {...rest}
        type="tertiary"
        htmlType={htmlType}
        className={joinClassNames("shop-btn", "shop-btn--secondary", className)}
      />
    );
  }
);
