import type { ButtonHTMLAttributes } from "react";
import { Field } from "./ui/Field";

function InspectorTextAction({
  className,
  type = "button",
  disabled,
  title,
  onClick,
  children,
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={["resource-text-action", className].filter(Boolean).join(" ")}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type Props = {
  disabled?: boolean;
  disabledReason?: string;
  onConfigure: () => void;
};

/** 未配置数据组绑定时的 Inspector 空态（对齐变量面板 Field + 文字操作） */
export function ListBindInspectorEmpty({ disabled, disabledReason, onConfigure }: Props) {
  return (
    <div className="inspector-list-bind-panel">
      <Field
        label="数据组绑定"
        headerExtra={
          <InspectorTextAction disabled={disabled} title={disabledReason} onClick={onConfigure}>
            配置绑定
          </InspectorTextAction>
        }
      >
        <p className="inspector__muted inspector-list-bind-panel__summary">
          绑定列表或对象变量后，可将变量中的多个字段一次性映射到本容器内的区块。
        </p>
      </Field>
    </div>
  );
}
