import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  /** 控制顶栏下拉槽固定宽度（版式与模板同宽；模板略宽） */
  variant: "email-template" | "layout-variant";
};

/** 顶栏资源选择：仅标签 + 下拉（操作收进下拉底部） */
export function TopbarResourceField({ label, children, variant }: Props) {
  return (
    <div
      className={[
        "topbar__select-wrap",
        variant === "email-template"
          ? "topbar__select-wrap--email-template"
          : "topbar__select-wrap--layout-variant",
      ].join(" ")}
    >
      <span className="topbar__select-label">{label}</span>
      <div className="topbar__select-slot">{children}</div>
    </div>
  );
}
