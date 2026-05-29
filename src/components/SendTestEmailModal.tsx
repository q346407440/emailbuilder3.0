import { useEffect, useState } from "react";
import type { SmtpTestStatus } from "../api/client";
import { resolveTestEmailSubject } from "../lib/emailDeliveryFields";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

export const TEST_RECIPIENT_STORAGE_KEY = "easy-email.smtp-test-recipient";

type Props = {
  visible: boolean;
  sending?: boolean;
  disabled?: boolean;
  smtpStatus: SmtpTestStatus | null;
  /** 与左侧「投递信息」同一份：主题行（meta.delivery.subject） */
  subject: string;
  /** 与左侧「投递信息」同一份：预览摘要（meta.delivery.preheader） */
  preheader: string;
  displayName: string;
  emailKey: string;
  onCancel: () => void;
  onSend: (args: { to: string }) => Promise<void>;
};

export function SendTestEmailModal({
  visible,
  sending,
  disabled,
  smtpStatus,
  subject,
  preheader,
  displayName,
  emailKey,
  onCancel,
  onSend,
}: Props) {
  const [to, setTo] = useState("");

  const resolvedSubject = resolveTestEmailSubject({ subject, displayName, emailKey });

  useEffect(() => {
    if (!visible) return;
    try {
      setTo(localStorage.getItem(TEST_RECIPIENT_STORAGE_KEY) ?? "");
    } catch {
      setTo("");
    }
  }, [visible]);

  const submit = async () => {
    const recipient = to.trim();
    if (!recipient) return;
    await onSend({ to: recipient });
    try {
      localStorage.setItem(TEST_RECIPIENT_STORAGE_KEY, recipient);
    } catch {
      /* 忽略 */
    }
  };

  const canSend =
    Boolean(smtpStatus?.configured) && !disabled && Boolean(to.trim()) && !sending;

  if (!visible) return null;

  return (
    <ShopSectionModal
      visible
      className="send-test-email-modal"
      wrapClassName="send-test-email-modal-wrap"
      title="发送测试邮件"
      onCancel={onCancel}
      maskClosable={!sending}
      closable={!sending}
      destroyOnClose
      footer={
        <>
          <span className="send-test-email-modal__footer-note">按当前画布预览发送</span>
          <div className="shop-section-modal__footer-actions">
            <ShopSecondaryButton onClick={onCancel} disabled={sending}>
              取消
            </ShopSecondaryButton>
            <ShopPrimaryButton
              onClick={() => void submit()}
              loading={sending}
              disabled={!canSend}
            >
              发送
            </ShopPrimaryButton>
          </div>
        </>
      }
    >
      {!smtpStatus?.configured ? (
        <p className="send-test-email-modal__alert" role="alert">
          未配置 SMTP，请先在 <code>.env</code> 中填写 <code>EMAIL_SMTP_*</code> 并重启服务。
        </p>
      ) : null}

      <div className="send-test-email-modal__form">
        <label className="send-test-email-modal__field">
          <span className="send-test-email-modal__label">收件人</span>
          <ShopInput
            autoFocus
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={sending || !smtpStatus?.configured}
            placeholder="测试邮箱地址"
            onPressEnter={() => {
              if (canSend) void submit();
            }}
          />
        </label>

        <dl className="send-test-email-modal__delivery-readonly" aria-label="投递信息（与左侧一致）">
          <div className="send-test-email-modal__delivery-row">
            <dt>主题</dt>
            <dd>{resolvedSubject}</dd>
          </div>
          <div className="send-test-email-modal__delivery-row">
            <dt>预览摘要</dt>
            <dd className={preheader.trim() ? undefined : "send-test-email-modal__delivery-empty"}>
              {preheader.trim() || "未填写"}
            </dd>
          </div>
        </dl>
        <p className="send-test-email-modal__delivery-hint">主题与预览摘要在左侧「投递信息」中修改。</p>
      </div>
    </ShopSectionModal>
  );
}
