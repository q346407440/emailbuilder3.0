import ArrowLeftOutlined from "@shoplazza/sds-icons/ArrowLeftOutlined";
import { goToEmailTemplateList } from "../../lib/appNavigation";

/** 编辑器顶栏：返回邮件模板列表页 */
export function TopbarHomeBackButton() {
  return (
    <div className="topbar__home-back-group">
      <button
        type="button"
        className="topbar__home-back"
        onClick={() => goToEmailTemplateList()}
        aria-label="返回邮件模板"
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
