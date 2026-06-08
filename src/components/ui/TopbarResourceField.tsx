import type { CSSProperties, ReactNode } from "react";
import { TOPBAR_RESOURCE_SELECT_SLOT_WIDTH } from "./topbarResourceSelectLayout";

type Props = {
  label: string;
  children: ReactNode;
  /** 控制顶栏选择框槽宽（邮件模板与版式结构同宽） */
  variant: "email-template" | "layout-variant";
};

const selectSlotStyle: CSSProperties = {
  flex: `0 0 ${TOPBAR_RESOURCE_SELECT_SLOT_WIDTH}px`,
  width: TOPBAR_RESOURCE_SELECT_SLOT_WIDTH,
  maxWidth: TOPBAR_RESOURCE_SELECT_SLOT_WIDTH,
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
      <div className="topbar__select-slot" style={selectSlotStyle}>
        {children}
      </div>
    </div>
  );
}
