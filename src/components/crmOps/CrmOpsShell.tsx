import type { ReactNode } from "react";
import {
  EMAIL_CAMPAIGN_PATH,
  EMAIL_TEMPLATE_LIST_PATH,
  goToEmailCampaign,
  goToEmailTemplateList,
  useAppPath,
} from "../../lib/appNavigation";
import "../../crm-ops-shell.css";

export type CrmOpsNavKey = "emailCampaign" | "templateEditor";

type CrmOpsShellProps = {
  activeNav: CrmOpsNavKey;
  children: ReactNode;
};

type NavItem =
  | {
      key: "emailCampaign";
      label: string;
      icon: ReactNode;
      kind: "internal";
      onNavigate: () => void;
      isActive: (pathname: string) => boolean;
    }
  | {
      key: "templateEditor";
      label: string;
      icon: ReactNode;
      kind: "internal";
      onNavigate: () => void;
      isActive: (pathname: string) => boolean;
    };

const EDITOR_ENTRY_ICON = (
  <svg className="crm-ops__nav-icon" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3 12.5V13h.5l7.1-7.1-.5-.5-7.1 7.1ZM12.8 4.2l-1-1a.6.6 0 0 0-.85 0l-.9.9 1.85 1.85.9-.9a.6.6 0 0 0 0-.85Z"
      fill="currentColor"
    />
    <path
      d="M2.5 11.5 10 4l2 2-7.5 7.5H2.5v-2Z"
      stroke="currentColor"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
  </svg>
);

function buildNavItems(): NavItem[] {
  return [
    {
      key: "emailCampaign",
      label: "商家邮件",
      kind: "internal",
      onNavigate: goToEmailCampaign,
      isActive: (pathname) =>
        pathname === "/" ||
        pathname === EMAIL_CAMPAIGN_PATH ||
        pathname.endsWith(EMAIL_CAMPAIGN_PATH),
      icon: (
        <svg className="crm-ops__nav-icon" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M2 4.5 8 9l6-4.5M2 4h12v8H2V4Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      key: "templateEditor",
      label: "邮件模板",
      kind: "internal",
      onNavigate: goToEmailTemplateList,
      isActive: (pathname) =>
        pathname === EMAIL_TEMPLATE_LIST_PATH || pathname.startsWith(`${EMAIL_TEMPLATE_LIST_PATH}/`),
      icon: EDITOR_ENTRY_ICON,
    },
  ];
}

export function CrmOpsShell({ activeNav, children }: CrmOpsShellProps) {
  const pathname = useAppPath();
  const navItems = buildNavItems();

  return (
    <div className="crm-ops">
      <header className="crm-ops__header">
        <div className="crm-ops__brand">
          <img
            className="crm-ops__brand-logo"
            src="/crm-ops/brand-logo.svg"
            width={120}
            height={32}
            alt="LOYALTY & PUSH OPERATIONS"
          />
        </div>
        <button type="button" className="crm-ops__user" aria-label="当前登录用户">
          <span className="crm-ops__user-avatar" aria-hidden>
            <svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor">
              <path d="M7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.67 0-5 1.34-5 3v.75h10v-.75c0-1.66-2.33-3-5-3Z" />
            </svg>
          </span>
          <span className="crm-ops__user-name">Heng Li</span>
          <img
            className="crm-ops__user-chevron"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(0,0,0,0.45)' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E"
            alt=""
            width={12}
            height={12}
          />
        </button>
      </header>

      <div className="crm-ops__body">
        <aside className="crm-ops__sidebar">
          <nav className="crm-ops__nav" aria-label="CRM 导航">
            {navItems.map((item) => {
              const active = activeNav === item.key || item.isActive(pathname);
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`crm-ops__nav-link${active ? " crm-ops__nav-link--active" : ""}`}
                  onClick={item.onNavigate}
                >
                  {item.icon}
                  <span className="crm-ops__nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="crm-ops__main">{children}</main>
      </div>
    </div>
  );
}
