import ArrowLeftOutlined from "@shoplazza/sds-icons/ArrowLeftOutlined";
import { goToEmailCampaign } from "../../lib/appNavigation";

/** 编辑器顶栏：返回 CRM 邮件列表首页（/emailCampaign） */
export function TopbarHomeBackButton() {
  return (
    <div className="topbar__home-back-group">
      <button
        type="button"
        className="topbar__home-back"
        onClick={() => goToEmailCampaign()}
        aria-label="返回首页"
      >
        <span className="topbar__home-back-icon" aria-hidden>
          <ArrowLeftOutlined />
        </span>
        <span className="topbar__home-back-label">返回</span>
      </button>
      <span className="topbar__home-back-divider" aria-hidden />
    </div>
  );
}
