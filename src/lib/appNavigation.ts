import { useEffect, useState } from "react";
import type { IntegrationTokenPresetSelection } from "./integrationStylePreset";

/** 默认首页：CRM-OPS 商家邮件列表（对齐 staging /emailCampaign） */
export const EMAIL_CAMPAIGN_PATH = "/emailCampaign";
export const EMAIL_CAMPAIGN_CREATE_PATH = "/emailCampaign/create";
/** 邮件模板列表页 */
export const EMAIL_TEMPLATE_LIST_PATH = "/email-templates";
export const INTEGRATION_PATH = "/integration";

export function isIntegrationPath(pathname: string): boolean {
  return pathname === INTEGRATION_PATH || pathname.endsWith(INTEGRATION_PATH);
}

export type EmailTemplateEditorRouteParams = {
  emailKey: string;
  layoutVariantId: string;
};

export type EmailTemplateEditorEntry = "catalog" | "campaign";

function trimPath(pathname: string): string {
  return pathname.replace(/\/+$/g, "") || "/";
}

export function parseEmailTemplateEditorPath(
  pathname: string
): EmailTemplateEditorRouteParams | null {
  const normalized = trimPath(pathname);
  const match = normalized.match(/^\/email-templates\/([^/]+)\/designs\/([^/]+)\/edit$/);
  if (!match) return null;
  return {
    emailKey: decodeURIComponent(match[1]!),
    layoutVariantId: decodeURIComponent(match[2]!),
  };
}

export function isEmailTemplateListPath(pathname: string): boolean {
  return trimPath(pathname) === EMAIL_TEMPLATE_LIST_PATH;
}

export function isEmailTemplateEditorPath(pathname: string): boolean {
  return parseEmailTemplateEditorPath(pathname) !== null;
}

/** 商家邮件壳层首页：`/` 与 `/emailCampaign` */
export function isEmailCampaignPath(pathname: string): boolean {
  if (isEmailTemplateListPath(pathname) || isEmailTemplateEditorPath(pathname) || isIntegrationPath(pathname)) {
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

export function useIsEmailTemplateEditorRoute(): boolean {
  const pathname = useAppPath();
  return isEmailTemplateEditorPath(pathname);
}

export function useIsEmailTemplateListRoute(): boolean {
  const pathname = useAppPath();
  return isEmailTemplateListPath(pathname);
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
export function goToEmailCampaign(): void {
  navigateApp(EMAIL_CAMPAIGN_PATH);
}

export function goToEmailCampaignCreate(): void {
  navigateApp(EMAIL_CAMPAIGN_CREATE_PATH);
}

export function goToEmailTemplateList(): void {
  navigateApp(EMAIL_TEMPLATE_LIST_PATH);
}

export function buildEmailTemplateEditorPath(
  emailKey: string,
  layoutVariantId: string,
  options?: { entry?: EmailTemplateEditorEntry }
): string {
  const path = `${EMAIL_TEMPLATE_LIST_PATH}/${encodeURIComponent(emailKey)}/designs/${encodeURIComponent(layoutVariantId)}/edit`;
  if (!options?.entry || options.entry === "catalog") return path;
  const params = new URLSearchParams({ entry: options.entry });
  return `${path}?${params.toString()}`;
}

/** 当前标签页内进入编辑器（接入页返回等） */
export function goToEmailEditor(): void {
  goToEmailTemplateList();
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
  const layout = (layoutVariantId ?? "").trim();
  if (!emailKey.trim() || !layout) {
    goToEmailTemplateList();
    return;
  }
  navigateApp(buildEmailTemplateEditorPath(emailKey, layout));
}

/** 从「创建邮件」进入编辑器：活动引用指定邮件模板与版式。 */
export function goToEmailEditorFromCampaignCreate(
  emailKey: string,
  layoutVariantId?: string | null
): void {
  const layout = (layoutVariantId ?? "").trim();
  if (!emailKey.trim() || !layout) {
    goToEmailTemplateList();
    return;
  }
  navigateApp(buildEmailTemplateEditorPath(emailKey, layout, { entry: "campaign" }));
}
