import { useEffect, useRef, useState } from "react";
import { message } from "@shoplazza/sds";
import { captureEmailPreviewHtmlFromDom } from "../lib/captureEmailPreviewHtml";
import { toUserFacingErrorMessage } from "../lib/userFacingError";
import { resolveTestEmailSubject } from "../lib/emailDeliveryFields";
import {
  buildMetaEditorPersistPatch,
  metaToEditorForm,
  type MetaEditorFormSnapshot,
} from "../lib/metaEditorPersist";
import {
  getEmailMeta,
  getSmtpTestStatus,
  putEmailMeta,
  sendTestEmail,
  type SmtpTestStatus,
} from "../api/client";
import { SendTestEmailModal } from "./SendTestEmailModal";
import { Field } from "./ui/Field";
import { InspectorPanelSection } from "./ui/InspectorPanelSection";
import { ShopCountInput, ShopCountTextArea } from "./ui/ShopFormControls";
import {
  META_DELIVERY_PREHEADER_MAX_LENGTH,
  META_DELIVERY_SUBJECT_MAX_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  META_DISPLAY_NAME_MAX_LENGTH,
} from "../meta-contract/field-limits";

/** 保存成功提示做节流，避免连续点击刷屏。 */
const META_SAVE_TOAST_MIN_MS = 2400;

function isMetaFormEqual(a: MetaEditorFormSnapshot, b: MetaEditorFormSnapshot): boolean {
  return (
    a.displayName === b.displayName &&
    a.description === b.description &&
    a.subject === b.subject &&
    a.preheader === b.preheader
  );
}

type Props = {
  emailKey: string | null;
  onError?: (message: string) => void;
  /** panel: 左侧整栏；embedded: 作为右侧 inspector 内容区 */
  variant?: "panel" | "embedded";
  /** embedded 场景是否渲染内部标题与保存按钮；弹窗中应由外层 header/footer 承担。 */
  showEmbeddedHeader?: boolean;
  /** 顶栏触发发送测试邮件（仅 embedded 场景会使用） */
  openSendTestNonce?: number;
  /** 外层 footer 触发保存 */
  externalSaveNonce?: number;
  /** 回传表单是否有未保存修改（给外层 footer 按钮禁用态） */
  onDirtyChange?: (dirty: boolean) => void;
  /** 回传保存中状态（给外层 footer 按钮 loading 态） */
  onSavingChange?: (saving: boolean) => void;
  /** 回传当前是否可发送测试邮件（给顶栏按钮禁用态） */
  onSendTestCapabilityChange?: (capable: boolean) => void;
  /** 模板信息保存成功后通知外层刷新列表等派生数据 */
  onSaved?: () => void;
};

export function MetaEditor({
  emailKey,
  onError,
  variant = "panel",
  showEmbeddedHeader = true,
  openSendTestNonce = 0,
  externalSaveNonce = 0,
  onDirtyChange,
  onSavingChange,
  onSendTestCapabilityChange,
  onSaved,
}: Props) {
  const [form, setForm] = useState<MetaEditorFormSnapshot>(() => metaToEditorForm(null));
  const [savedForm, setSavedForm] = useState<MetaEditorFormSnapshot>(() => metaToEditorForm(null));
  const [loaded, setLoaded] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<SmtpTestStatus | null>(null);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const lastMetaToastAtRef = useRef(0);
  const prevOpenSendTestNonceRef = useRef(openSendTestNonce);
  const prevExternalSaveNonceRef = useRef(externalSaveNonce);

  useEffect(() => {
    let cancelled = false;
    if (!emailKey) {
      const emptyForm = metaToEditorForm(null);
      setForm(emptyForm);
      setSavedForm(emptyForm);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    void (async () => {
      try {
        const m = await getEmailMeta(emailKey);
        if (cancelled) return;
        const nextForm = metaToEditorForm(m);
        setForm(nextForm);
        setSavedForm(nextForm);
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        onError?.(toUserFacingErrorMessage(err, "加载模板信息失败，请刷新重试"));
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [emailKey, onError]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getSmtpTestStatus();
        if (!cancelled) setSmtpStatus(status);
      } catch (err) {
        if (!cancelled) {
          setSmtpStatus({ configured: false });
          onError?.(toUserFacingErrorMessage(err, "获取邮件服务状态失败，请稍后重试"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  function notifyMetaPersisted() {
    const now = Date.now();
    if (now - lastMetaToastAtRef.current < META_SAVE_TOAST_MIN_MS) return;
    lastMetaToastAtRef.current = now;
    message.info("模板信息已保存", 1.6);
  }

  function update<K extends keyof MetaEditorFormSnapshot>(key: K, value: MetaEditorFormSnapshot[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveMeta(next: MetaEditorFormSnapshot): Promise<boolean> {
    if (!emailKey || !loaded) return false;
    setSavingMeta(true);
    try {
      await putEmailMeta(emailKey, buildMetaEditorPersistPatch(next));
      setSavedForm(next);
      notifyMetaPersisted();
      onSaved?.();
      return true;
    } catch (err) {
      const msg = toUserFacingErrorMessage(err, "保存失败，请稍后重试");
      onError?.(msg);
      message.error(msg);
      return false;
    } finally {
      setSavingMeta(false);
    }
  }

  const disabled = !emailKey;
  const isEmbedded = variant === "embedded";
  const dirty = loaded && !disabled && !isMetaFormEqual(form, savedForm);
  const canSendTest = !disabled && Boolean(smtpStatus?.configured);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(savingMeta);
    return () => onSavingChange?.(false);
  }, [savingMeta, onSavingChange]);

  useEffect(() => {
    onSendTestCapabilityChange?.(canSendTest);
  }, [canSendTest, onSendTestCapabilityChange]);

  useEffect(() => {
    const prev = prevExternalSaveNonceRef.current;
    prevExternalSaveNonceRef.current = externalSaveNonce;
    if (externalSaveNonce === prev) return;
    if (!dirty || savingMeta) return;
    void saveMeta(form);
  }, [dirty, externalSaveNonce, form, savingMeta]);

  useEffect(() => {
    const prev = prevOpenSendTestNonceRef.current;
    prevOpenSendTestNonceRef.current = openSendTestNonce;
    if (!isEmbedded) return;
    if (openSendTestNonce === prev) return;
    if (!canSendTest) return;
    setSendTestOpen(true);
  }, [canSendTest, isEmbedded, openSendTestNonce]);

  async function handleSendTestEmail(args: { to: string }) {
    if (!emailKey) return;
    const subject = resolveTestEmailSubject({
      subject: form.subject,
      displayName: form.displayName,
      emailKey,
    });
    const preheader = form.preheader.trim();
    const html = captureEmailPreviewHtmlFromDom({ subject, preheader });
    if (!html) {
      message.error("未找到画布预览内容，请确认中间「画布预览」已加载");
      return;
    }
    setSending(true);
    try {
      await sendTestEmail(emailKey, {
        to: args.to,
        html,
        subject,
        preheader,
      });
      message.success("测试邮件已发送，请前往收件箱查看", 3);
      setSendTestOpen(false);
    } catch (err) {
      const msg = toUserFacingErrorMessage(err, "发送失败，请稍后重试");
      message.error(msg);
      onError?.(msg);
    } finally {
      setSending(false);
    }
  }

  const content = (
    <div className={isEmbedded ? "meta-editor__scroll meta-editor__scroll--embedded" : "block-tree__scroll meta-editor__scroll"}>
        {dirty ? <p className="meta-editor__save-status meta-editor__save-status--dirty">有未保存修改</p> : null}

        <InspectorPanelSection title="模板基础信息" className="meta-editor__section">
          <Field label="邮件模板名称" className="meta-editor__field">
            <ShopCountInput
              name="displayName"
              value={form.displayName}
              maxLength={META_DISPLAY_NAME_MAX_LENGTH}
              onChange={(value) => update("displayName", value)}
              disabled={disabled}
              placeholder="邮件在列表中的名称"
            />
          </Field>
          <Field label="模板说明" className="meta-editor__field">
            <ShopCountTextArea
              name="description"
              rows={2}
              value={form.description}
              maxLength={META_DESCRIPTION_MAX_LENGTH}
              onChange={(value) => update("description", value)}
              disabled={disabled}
              placeholder="可选，内部备注"
            />
          </Field>
        </InspectorPanelSection>

        <InspectorPanelSection title="发信信息" className="meta-editor__section">
          <Field label="发信主题" className="meta-editor__field">
            <ShopCountInput
              name="subject"
              value={form.subject}
              maxLength={META_DELIVERY_SUBJECT_MAX_LENGTH}
              onChange={(value) => update("subject", value)}
              disabled={disabled}
              placeholder="收件箱第一行标题"
            />
          </Field>
          <Field label="发信预览摘要" className="meta-editor__field">
            <ShopCountInput
              name="preheader"
              value={form.preheader}
              maxLength={META_DELIVERY_PREHEADER_MAX_LENGTH}
              onChange={(value) => update("preheader", value)}
              disabled={disabled}
              placeholder="收件箱第二行摘要"
            />
          </Field>
        </InspectorPanelSection>
      </div>
  );

  return (
    <>
      {isEmbedded ? (
        <>
          {showEmbeddedHeader ? (
            <div className="side-inspector__headrow meta-editor__headrow">
              <h2 className="side-panel__title">模板信息</h2>
              <div className="resource-text-actions meta-editor__head-actions" role="group" aria-label="模板信息操作">
                <button
                  type="button"
                  className="resource-text-action"
                  disabled={disabled || savingMeta || !dirty}
                  onClick={() => void saveMeta(form)}
                  title="保存模板信息"
                >
                  {savingMeta ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          ) : null}
          {content}
        </>
      ) : (
        <aside className="block-tree meta-editor" aria-label="模板信息">
          <div className="block-tree__title">模板信息</div>
          {content}
        </aside>
      )}
      <SendTestEmailModal
        visible={sendTestOpen}
        sending={sending}
        disabled={disabled}
        smtpStatus={smtpStatus}
        displayName={form.displayName}
        emailKey={emailKey ?? ""}
        subject={form.subject}
        preheader={form.preheader}
        onCancel={() => {
          if (!sending) setSendTestOpen(false);
        }}
        onSend={handleSendTestEmail}
      />
    </>
  );
}
