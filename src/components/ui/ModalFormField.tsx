import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
};

/** 弹窗内表单项：配置小标题在上、控件在下（与 Inspector Field 规范一致） */
export function ModalFormField({ label, htmlFor, children, hint }: Props) {
  return (
    <div className="modal-form-field">
      <label className="modal-form-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="modal-form-field__control">{children}</div>
      {hint ? <div className="modal-form-field__hint">{hint}</div> : null}
    </div>
  );
}
