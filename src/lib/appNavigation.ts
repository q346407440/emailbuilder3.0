import { useEffect, useState } from "react";
import type { IntegrationTokenPresetSelection } from "./integrationStylePreset";

/** 默认首页：CRM-OPS 商家邮件列表（对齐 staging /emailCampaign） */
export const EMAIL_CAMPAIGN_PATH = "/emailCampaign";
export const EMAIL_CAMPAIGN_CREATE_PATH = "/emailCampaign/create";
/** 邮件模板编辑器（原根路径 `/`） */
export const EDITOR_PATH = "/editor";
export const INTEGRATION_PATH = "/integration";

export function isIntegrationPath(pathname: string): boolean {
  return pathname === INTEGRATION_PATH || pathname.endsWith(INTEGRATION_PATH);
}

export function isEditorPath(pathname: string): boolean {
  return pathname === EDITOR_PATH || pathname.endsWith(EDITOR_PATH);
}

/** 商家邮件壳层首页：`/` 与 `/emailCampaign` */
export function isEmailCampaignPath(pathname: string): boolean {
  if (isEditorPath(pathname) || isIntegrationPath(pathname)) {
    return false;
  }
  return pathname === "/" || pathname === EMAIL_CAMPAIGN_PATH;
}

export function isEmailCampaignCreatePath(pathname: string): boolean {
  return pathname === EMAIL_CAMPAIGN_CREATE_PATH || pathname.endsWith(EMAIL_CAMPAIGN_CREATE_PATH);
}

export function navigateApp(path: string): void {
  if (window.location.pathname === path && !window.location.search) return;
  const target = new URL(path, window.location.origin);
  if (
    window.location.pathname === target.pathname &&
    window.location.search === target.search
  ) {
    return;
  }
  window.history.pushState({}, "", target.pathname + target.search);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useAppPath(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return pathname;
}

export function useIsIntegrationRoute(): boolean {
  const pathname = useAppPath();
  return isIntegrationPath(pathname);
}

export function useIsEditorRoute(): boolean {
  const pathname = useAppPath();
  return isEditorPath(pathname);
}

export function useIsEmailCampaignRoute(): boolean {
  const pathname = useAppPath();
  return isEmailCampaignPath(pathname);
}

export function useIsEmailCampaignCreateRoute(): boolean {
  const pathname = useAppPath();
  return isEmailCampaignCreatePath(pathname);
}

/**
 * 兼容旧书签：根路径带 `emailKey` / `layout` 查询时自动进入编辑器。
 */
export function useLegacyEditorQueryRedirect(): void {
  useEffect(() => {
    const { pathname, search } = window.location;
    if (!isEmailCampaignPath(pathname) || !search) return;
    const params = new URLSearchParams(search);
    if (!params.has("emailKey") && !params.has("email") && !params.has("layout")) return;
    navigateApp(`${EDITOR_PATH}${search}`);
  }, []);
}

export function goToEmailCampaign(): void {
  navigateApp(EMAIL_CAMPAIGN_PATH);
}

export function goToEmailCampaignCreate(): void {
  navigateApp(EMAIL_CAMPAIGN_CREATE_PATH);
}

/** 编辑器完整 URL（用于新标签页或外链） */
export function buildEditorAbsoluteUrl(search = ""): string {
  const normalized = search.startsWith("?") || search === "" ? search : `?${search}`;
  return new URL(`${EDITOR_PATH}${normalized}`, window.location.origin).href;
}

/** CRM 侧栏：新标签页打开独立编辑器（非壳层内嵌） */
export function openEmailTemplateEditorInNewTab(
  ctx?: { emailKey?: string; layoutVariantId?: string | null }
): void {
  const params = new URLSearchParams();
  const emailKey = (ctx?.emailKey ?? "").trim();
  if (emailKey) params.set("emailKey", emailKey);
  const layout = (ctx?.layoutVariantId ?? "").trim();
  if (layout) params.set("layout", layout);
  const qs = params.toString();
  const url = buildEditorAbsoluteUrl(qs ? `?${qs}` : "");
  window.open(url, "_blank", "noopener,noreferrer");
}

/** 当前标签页内进入编辑器（接入页返回等） */
export function goToEmailEditor(): void {
  navigateApp(EDITOR_PATH);
}

export type IntegrationNavigationContext = {
  layoutVariantId?: string | null;
  /** `local` 或公共预设 presetId */
  tokenPreset?: IntegrationTokenPresetSelection | null;
};

/** 接入页 URL 查询参数（与顶栏选择同步） */
export function buildIntegrationSearchParams(
  emailKey: string,
  ctx?: IntegrationNavigationContext
): string {
  const params = new URLSearchParams({ emailKey });
  const layout = (ctx?.layoutVariantId ?? "").trim();
  if (layout) params.set("layout", layout);
  const token = (ctx?.tokenPreset ?? "").trim();
  if (token) params.set("tokenPreset", token);
  return params.toString();
}

/** 打开当前场景的外部 API 接入页（携带 emailKey、版式、样式来源） */
export function goToExternalApiIntegration(
  emailKey: string,
  layoutVariantIdOrCtx?: string | null | IntegrationNavigationContext
): void {
  const ctx: IntegrationNavigationContext =
    layoutVariantIdOrCtx && typeof layoutVariantIdOrCtx === "object"
      ? layoutVariantIdOrCtx
      : { layoutVariantId: layoutVariantIdOrCtx ?? null };
  navigateApp(`${INTEGRATION_PATH}?${buildIntegrationSearchParams(emailKey, ctx)}`);
}

/** 返回邮件编辑器并选中指定模板（可选版式） */
export function goToEmailEditorWithContext(
  emailKey: string,
  layoutVariantId?: string | null
): void {
  const params = new URLSearchParams({ emailKey });
  const layout = (layoutVariantId ?? "").trim();
  if (layout) params.set("layout", layout);
  const qs = params.toString();
  navigateApp(qs ? `${EDITOR_PATH}?${qs}` : EDITOR_PATH);
}

/** 从「创建邮件」进入编辑器：锁定顶栏模板、版式切换与发布状态操作，由上一级页面托管来源。 */
export function goToEmailEditorFromCampaignCreate(
  emailKey: string,
  layoutVariantId?: string | null
): void {
  const params = new URLSearchParams({ emailKey, lockFromCampaignCreate: "1" });
  const layout = (layoutVariantId ?? "").trim();
  if (layout) params.set("layout", layout);
  navigateApp(`${EDITOR_PATH}?${params.toString()}`);
}
