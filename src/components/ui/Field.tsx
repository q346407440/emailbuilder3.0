import type { ReactNode } from "react";
import { TopTip } from "./TopTip";

type Props = {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
  /** 标题行最右侧（如样式令牌 / 变量赋值的「自定义」「恢复跟随」） */
  headerExtra?: ReactNode;
  /** 阻断级校验文案（字段下展示） */
  error?: string;
  /** 非阻断建议（字段下展示） */
  warning?: string;
};

/** 表单行标签容器（属性面板等复用） */
export function Field({ label, children, hint, className, headerExtra, error, warning }: Props) {
  const toneClass = error
    ? "inspector-field--error"
    : warning
      ? "inspector-field--warn"
      : "";
  const rootClass = ["inspector-field", toneClass, className].filter(Boolean).join(" ");

  /** 使用 div 而非 label：避免多个按钮 + contenteditable 同级嵌套在 label 内时，浏览器对 hover/焦点产生异常反馈 */
  return (
    <div className={rootClass}>
      <div className="inspector-field__header">
        <div className="inspector-field__label">
          <span className="inspector-field__label-text" title={label}>
            {label}
          </span>
          {hint ? <TopTip content={hint} /> : null}
        </div>
        {headerExtra ? <div className="inspector-field__header-extra">{headerExtra}</div> : null}
      </div>
      {children}
      {error ? (
        <p className="inspector-field__message inspector-field__message--error" role="alert">
          {error}
        </p>
      ) : warning ? (
        <p className="inspector-field__message inspector-field__message--warn">{warning}</p>
      ) : null}
    </div>
  );
}
