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

/** 未配置列表绑定时的 Inspector 空态（对齐变量面板 Field + 文字操作） */
export function ListBindInspectorEmpty({ disabled, disabledReason, onConfigure }: Props) {
  return (
    <div className="inspector-list-bind-panel">
      <Field
        label="列表绑定"
        headerExtra={
          <InspectorTextAction disabled={disabled} title={disabledReason} onClick={onConfigure}>
            配置绑定
          </InspectorTextAction>
        }
      >
        <p className="inspector__muted inspector-list-bind-panel__summary">
          绑定列表变量后，将按数据条数自动生成多行内容。
        </p>
      </Field>
    </div>
  );
}
