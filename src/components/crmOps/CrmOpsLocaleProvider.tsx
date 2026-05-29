import { ConfigProvider } from "@shoplazza/sds";
import zhCN from "@shoplazza/sds/es/locale/zh_CN";
import type { ReactNode } from "react";

/** CRM 壳层内 SDS 组件中文 locale（分页「条/页」「跳至」等） */
export function CrmOpsLocaleProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider locale={zhCN}>{children}</ConfigProvider>;
}
